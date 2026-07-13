import { describe, expect, it } from 'vitest';
import type { MatchResultData, Player } from '../../types';
import { mergePlayersByBattleTag, syncMatchResultPlayerIdentities } from './index';

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
