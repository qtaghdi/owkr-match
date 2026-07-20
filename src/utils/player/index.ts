import type { MatchResultData, Player, RoleAssignment } from '../../types';

const ROLES = ['TANK', 'DPS', 'SUPPORT'] as const;

const normalizeBattleTag = (name: string): string => name.trim().toLowerCase();

const getPlayerFingerprint = (player: Player): string => {
    const rankFingerprint = (rank: Player['tank']): string => [
        rank.tier,
        rank.div,
        rank.score,
        rank.isPreferred ? 1 : 0,
        rank.isAvoided ? 1 : 0,
    ].join(':');

    return [
        normalizeBattleTag(player.name),
        player.discordName?.trim() ?? '',
        player.noMic ? 1 : 0,
        rankFingerprint(player.tank),
        rankFingerprint(player.dps),
        rankFingerprint(player.sup),
    ].join('|');
};

export type RosterImportMode = 'replace' | 'append';

export interface PlayerReconciliationResult {
    players: Player[];
    addedCount: number;
    updatedCount: number;
    unchangedCount: number;
    removedCount: number;
}

/**
 * @description 중복 배틀태그를 제거하고 처음 등장한 참가자의 순서를 유지한다.
 */
const dedupePlayersByBattleTag = (players: Player[]): Player[] => {
    const seenBattleTags = new Set<string>();

    return players.filter((player) => {
        const battleTag = normalizeBattleTag(player.name);
        if (seenBattleTags.has(battleTag)) return false;
        seenBattleTags.add(battleTag);
        return true;
    });
};

/**
 * @description 기존 참가자의 안정적인 ID를 유지하면서 새 명단의 최신 프로필을 반영한다.
 */
const resolveKnownPlayer = (existing: Player, incoming: Player): Player => ({
    ...incoming,
    id: existing.id,
    discordName: incoming.discordName?.trim() || existing.discordName?.trim() || undefined,
});

/**
 * @description 붙여넣은 명단을 현재 명단과 비교해 교체 또는 추가 결과와 변경 요약을 만든다.
 */
export const reconcilePlayers = (
    existing: Player[],
    incoming: Player[],
    mode: RosterImportMode,
): PlayerReconciliationResult => {
    const currentPlayers = dedupePlayersByBattleTag(existing);
    const incomingPlayers = dedupePlayersByBattleTag(incoming);
    const currentByBattleTag = new Map(
        currentPlayers.map((player) => [normalizeBattleTag(player.name), player]),
    );
    const incomingBattleTags = new Set(
        incomingPlayers.map((player) => normalizeBattleTag(player.name)),
    );

    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    const resolvedIncoming = incomingPlayers.map((player) => {
        const existingPlayer = currentByBattleTag.get(normalizeBattleTag(player.name));

        if (!existingPlayer) {
            addedCount++;
            return player;
        }

        const resolvedPlayer = resolveKnownPlayer(existingPlayer, player);
        if (getPlayerFingerprint(existingPlayer) === getPlayerFingerprint(resolvedPlayer)) {
            unchangedCount++;
        } else {
            updatedCount++;
        }

        return resolvedPlayer;
    });

    const removedCount = mode === 'replace'
        ? currentPlayers.filter(
            (player) => !incomingBattleTags.has(normalizeBattleTag(player.name)),
        ).length
        : 0;

    if (mode === 'replace') {
        return {
            players: resolvedIncoming,
            addedCount,
            updatedCount,
            unchangedCount,
            removedCount,
        };
    }

    const resolvedByBattleTag = new Map(
        resolvedIncoming.map((player) => [normalizeBattleTag(player.name), player]),
    );
    const appendedPlayers = currentPlayers.map((player) => (
        resolvedByBattleTag.get(normalizeBattleTag(player.name)) ?? player
    ));

    for (const player of resolvedIncoming) {
        if (!currentByBattleTag.has(normalizeBattleTag(player.name))) {
            appendedPlayers.push(player);
        }
    }

    return {
        players: appendedPlayers,
        addedCount,
        updatedCount,
        unchangedCount,
        removedCount,
    };
};

const syncAssignmentIdentities = (
    assignment: RoleAssignment,
    playerByBattleTag: Map<string, Player>,
): RoleAssignment => {
    const syncedAssignment = { ...assignment };

    for (const role of ROLES) {
        syncedAssignment[role] = assignment[role].map((player) => {
            const currentPlayer = playerByBattleTag.get(normalizeBattleTag(player.name));
            const discordName = currentPlayer?.discordName?.trim();
            return discordName && discordName !== player.discordName?.trim()
                ? { ...player, discordName }
                : player;
        });
    }

    return syncedAssignment;
};

/**
 * @description 참가자 명단의 최신 디스코드 이름을 저장된 매칭 결과의 플레이어에도 반영한다.
 */
export const syncMatchResultPlayerIdentities = (
    result: MatchResultData,
    players: Player[],
): MatchResultData => {
    const playerByBattleTag = new Map(
        players.map((player) => [normalizeBattleTag(player.name), player]),
    );

    return {
        ...result,
        teamA: {
            ...result.teamA,
            assignment: syncAssignmentIdentities(result.teamA.assignment, playerByBattleTag),
        },
        teamB: {
            ...result.teamB,
            assignment: syncAssignmentIdentities(result.teamB.assignment, playerByBattleTag),
        },
    };
};

/**
 * @description 현재 참가자 10명의 정보와 저장된 매칭 결과가 서로 다른지 확인한다.
 */
export const isMatchResultStale = (result: MatchResultData, participants: Player[]): boolean => {
    if (participants.length !== 10) return true;

    const resultPlayers = [result.teamA, result.teamB].flatMap(team => (
        ROLES.flatMap(role => team.assignment[role])
    ));
    if (resultPlayers.length !== 10) return true;

    const currentFingerprints = participants.map(getPlayerFingerprint).sort();
    const resultFingerprints = resultPlayers.map(getPlayerFingerprint).sort();

    return currentFingerprints.some((fingerprint, index) => fingerprint !== resultFingerprints[index]);
};
