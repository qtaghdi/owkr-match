import { describe, expect, it } from 'vitest';
import type { MatchResultData, Player } from '../../types';
import { isMatchResultStale, mergePlayersByBattleTag, syncMatchResultPlayerIdentities } from './index';

const createPlayer = (id: number, name: string, discordName?: string): Player => ({
    id,
    name,
    discordName,
    tank: { tier: 'GOLD', div: 3, score: 2200, isPreferred: false, isAvoided: false },
    dps: { tier: 'GOLD', div: 3, score: 2200, isPreferred: false, isAvoided: false },
    sup: { tier: 'GOLD', div: 3, score: 2200, isPreferred: false, isAvoided: false },
});

describe('mergePlayersByBattleTag', () => {
    it('기존 참가자의 디스코드 이름을 갱신하고 새 참가자는 추가한다', () => {
        const existing = [createPlayer(1, 'Player#1234')];
        const incoming = [
            createPlayer(2, 'player#1234', '디스코드 이름'),
            createPlayer(3, 'New#5678', '새 참가자'),
        ];

        const merged = mergePlayersByBattleTag(existing, incoming);

        expect(merged).toMatchObject({
            addedCount: 1,
            updatedDiscordNameCount: 1,
            unchangedDuplicateCount: 0,
        });
        expect(merged.players).toHaveLength(2);
        expect(merged.players[0]).toMatchObject({ id: 1, discordName: '디스코드 이름' });
    });
});

describe('syncMatchResultPlayerIdentities', () => {
    it('저장된 매칭 결과에도 최신 디스코드 이름을 반영한다', () => {
        const player = createPlayer(1, 'Player#1234');
        const result: MatchResultData = {
            teamA: {
                name: 'TEAM 1',
                assignment: { TANK: [player], DPS: [], SUPPORT: [] },
                realScore: 2200,
            },
            teamB: {
                name: 'TEAM 2',
                assignment: { TANK: [], DPS: [], SUPPORT: [] },
                realScore: 0,
            },
            diff: 2200,
        };

        const synced = syncMatchResultPlayerIdentities(
            result,
            [createPlayer(1, 'Player#1234', '디스코드 이름')],
        );

        expect(synced.teamA.assignment.TANK[0].discordName).toBe('디스코드 이름');
    });
});

describe('isMatchResultStale', () => {
    const createResult = (players: Player[]): MatchResultData => ({
        teamA: {
            name: 'TEAM 1',
            assignment: { TANK: [players[0]], DPS: [players[1], players[2]], SUPPORT: [players[3], players[4]] },
            realScore: 11000,
        },
        teamB: {
            name: 'TEAM 2',
            assignment: { TANK: [players[5]], DPS: [players[6], players[7]], SUPPORT: [players[8], players[9]] },
            realScore: 11000,
        },
        diff: 0,
    });

    it('순서만 바뀐 같은 참가자는 유효한 결과로 판단한다', () => {
        const players = Array.from({ length: 10 }, (_, index) => createPlayer(index, `Player${index}#1234`));
        const result = createResult(players);

        expect(isMatchResultStale(result, [...players].reverse())).toBe(false);
    });

    it('참가자의 랭크가 바뀌면 다시 매칭이 필요하다고 판단한다', () => {
        const players = Array.from({ length: 10 }, (_, index) => createPlayer(index, `Player${index}#1234`));
        const result = createResult(players);
        const changedPlayers = players.map((player, index) => index === 0
            ? { ...player, tank: { ...player.tank, score: 2800, tier: 'PLATINUM' } }
            : player);

        expect(isMatchResultStale(result, changedPlayers)).toBe(true);
    });
});
