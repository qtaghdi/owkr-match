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

export interface PlayerMergeResult {
    players: Player[];
    addedCount: number;
    updatedDiscordNameCount: number;
    unchangedDuplicateCount: number;
}

/**
 * @description 배틀태그가 같은 기존 참가자는 디스코드 이름을 보강하고 새 참가자만 뒤에 추가한다.
 */
export const mergePlayersByBattleTag = (existing: Player[], incoming: Player[]): PlayerMergeResult => {
    const players = [...existing];
    const indexByBattleTag = new Map(
        players.map((player, index) => [normalizeBattleTag(player.name), index]),
    );
    let addedCount = 0;
    let updatedDiscordNameCount = 0;
    let unchangedDuplicateCount = 0;

    for (const player of incoming) {
        const battleTag = normalizeBattleTag(player.name);
        const existingIndex = indexByBattleTag.get(battleTag);

        if (existingIndex === undefined) {
            indexByBattleTag.set(battleTag, players.length);
            players.push(player);
            addedCount++;
            continue;
        }

        const discordName = player.discordName?.trim();
        const existingPlayer = players[existingIndex];
        if (discordName && discordName !== existingPlayer.discordName?.trim()) {
            players[existingIndex] = { ...existingPlayer, discordName };
            updatedDiscordNameCount++;
        } else {
            unchangedDuplicateCount++;
        }
    }

    return { players, addedCount, updatedDiscordNameCount, unchangedDuplicateCount };
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
