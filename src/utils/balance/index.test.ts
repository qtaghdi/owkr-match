import { describe, expect, it } from 'vitest';
import type { MatchResultData, Player, Rank, Role } from '../../types';
import { balancePlayers, recalculateMatchResult } from './index';

const createRank = (role: Role, preferredRole: Role): Rank => ({
    tier: 'DIAMOND',
    div: 3,
    score: 2700,
    isPreferred: role === preferredRole,
    isAvoided: false,
});

const createPlayer = (index: number, preferredRole: Role): Player => ({
    id: index,
    name: `Player${index}#1234`,
    discordName: `디코 ${index}`,
    tank: createRank('TANK', preferredRole),
    dps: createRank('DPS', preferredRole),
    sup: createRank('SUPPORT', preferredRole),
});

const getAssignmentSlots = (result: MatchResultData): Map<number, string> => {
    const slots = new Map<number, string>();
    const addTeam = (team: 'A' | 'B', assignment: MatchResultData['teamA']['assignment']) => {
        slots.set(assignment.TANK[0].id, `${team}:TANK`);
        for (const player of assignment.DPS) slots.set(player.id, `${team}:DPS`);
        for (const player of assignment.SUPPORT) slots.set(player.id, `${team}:SUPPORT`);
    };

    addTeam('A', result.teamA.assignment);
    addTeam('B', result.teamB.assignment);
    return slots;
};

const countAssignmentChanges = (first: MatchResultData, second: MatchResultData): number => {
    const firstSlots = getAssignmentSlots(first);
    const secondSlots = getAssignmentSlots(second);
    return [...firstSlots].filter(([playerId, slot]) => secondSlots.get(playerId) !== slot).length;
};

describe('balancePlayers', () => {
    it('선호 역할을 지키면서 모든 플레이어를 한 번씩 배치한다', () => {
        const players = [
            createPlayer(1, 'TANK'),
            createPlayer(2, 'TANK'),
            createPlayer(3, 'DPS'),
            createPlayer(4, 'DPS'),
            createPlayer(5, 'DPS'),
            createPlayer(6, 'DPS'),
            createPlayer(7, 'SUPPORT'),
            createPlayer(8, 'SUPPORT'),
            createPlayer(9, 'SUPPORT'),
            createPlayer(10, 'SUPPORT'),
        ];

        const balanceResult = balancePlayers(players);
        const assignments = [balanceResult.result.teamA.assignment, balanceResult.result.teamB.assignment];
        const assignedPlayers = assignments.flatMap((assignment) => [
            ...assignment.TANK.map((player) => [player, 'TANK'] as const),
            ...assignment.DPS.map((player) => [player, 'DPS'] as const),
            ...assignment.SUPPORT.map((player) => [player, 'SUPPORT'] as const),
        ]);

        expect(new Set(assignedPlayers.map(([player]) => player.id)).size).toBe(10);
        expect(assignedPlayers.every(([player, role]) => {
            const rank = role === 'TANK' ? player.tank : role === 'DPS' ? player.dps : player.sup;
            return rank.isPreferred;
        })).toBe(true);
        expect(balanceResult.alternatives).toHaveLength(4);
        const results = [balanceResult.result, ...balanceResult.alternatives];
        expect(results.every((result, index) => results.slice(index + 1).every(
            (otherResult) => countAssignmentChanges(result, otherResult) >= 3,
        ))).toBe(true);
    });

    it('동일 입력에 대해 같은 결과를 반환한다', () => {
        const roles: Role[] = ['TANK', 'TANK', 'DPS', 'DPS', 'DPS', 'DPS', 'SUPPORT', 'SUPPORT', 'SUPPORT', 'SUPPORT'];
        const players = roles.map((role, index) => createPlayer(index + 1, role));

        expect(balancePlayers(players)).toEqual(balancePlayers(players));
    });

    it('수동 역할 교체 후 팀 점수와 차이를 다시 계산한다', () => {
        const roles: Role[] = ['TANK', 'TANK', 'DPS', 'DPS', 'DPS', 'DPS', 'SUPPORT', 'SUPPORT', 'SUPPORT', 'SUPPORT'];
        const players = roles.map((role, index) => createPlayer(index + 1, role));
        players[0].dps.score = 3300;

        const original = balancePlayers(players).result;
        const changed = structuredClone(original);
        const tank = changed.teamA.assignment.TANK[0];
        const dps = changed.teamA.assignment.DPS[0];
        changed.teamA.assignment.TANK[0] = dps;
        changed.teamA.assignment.DPS[0] = tank;

        const recalculated = recalculateMatchResult(changed);

        expect(recalculated.teamA.realScore).not.toBe(original.teamA.realScore);
        expect(recalculated.diff).toBe(Math.abs(recalculated.teamA.realScore - recalculated.teamB.realScore));
        expect(recalculated.metrics?.totalDiff).toBe(recalculated.diff);
        expect(recalculated.metrics).toMatchObject({
            preferenceViolations: expect.any(Number),
            avoidedAssignments: expect.any(Number),
            unrankedAssignments: expect.any(Number),
        });
    });

    it('10명이 아니면 명확한 오류를 반환한다', () => {
        expect(() => balancePlayers([])).toThrow('플레이어가 10명이어야 합니다.');
    });
});
