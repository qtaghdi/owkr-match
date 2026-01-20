import { useState, useCallback } from 'react';
import { Player, TeamResult, MatchResultData, Role, Rank, RoleAssignment } from '../types';

/**
 * @description 선호 역할 배치를 우선시키기 위한 보너스 점수 상수.
 */
const PREFERRED_BONUS = 100_000_000;

/**
 * @description 다른 역할이 선호일 때 배치를 억제하는 페널티 점수 상수.
 */
const PREFERRED_PENALTY = 50_000_000;

/**
 * @description 플레이어의 역할별 알고리즘 점수를 계산한다 (선호도 반영).
 * @param player - 플레이어 객체
 * @param role - 계산할 역할
 * @returns 알고리즘 점수
 */
const getPlayerAlgoScore = (player: Player, role: Role): number => {
    const rankMap: Record<Role, Rank> = {
        'TANK': player.tank,
        'DPS': player.dps,
        'SUPPORT': player.sup
    };

    const rank = rankMap[role];
    if (!rank) return 0;

    let score = rank.score;

    if (rank.isPreferred) {
        score += PREFERRED_BONUS;
    }

    const otherRoles: Role[] = (['TANK', 'DPS', 'SUPPORT'] as Role[]).filter(r => r !== role);
    const prefersOther = otherRoles.some(r => rankMap[r]?.isPreferred);

    if (prefersOther) {
        score -= PREFERRED_PENALTY;
    }

    return score;
};

/**
 * @description 플레이어의 역할별 실제 점수를 반환한다 (순수 티어 기반).
 * @param player - 플레이어 객체
 * @param role - 계산할 역할
 * @returns 실제 점수
 */
const getPlayerRealScore = (player: Player, role: Role): number => {
    const rankMap: Record<Role, Rank> = {
        'TANK': player.tank,
        'DPS': player.dps,
        'SUPPORT': player.sup
    };
    return rankMap[role]?.score || 0;
};

interface AssignmentResult {
    assignment: RoleAssignment;
    algoScore: number;
    realScore: number;
}

/**
 * @description 5인 팀의 모든 역할 배치 조합을 생성한다.
 * @param teamPlayers - 5명의 플레이어 배열
 * @returns 모든 가능한 배치 결과 배열
 */
const getAllTeamAssignments = (teamPlayers: Player[]): AssignmentResult[] => {
    const results: AssignmentResult[] = [];

    // 탱커 1명 선택 (5가지)
    for (let t = 0; t < 5; t++) {
        const remainders = [0, 1, 2, 3, 4].filter(idx => idx !== t);

        // 딜러 2명 선택 (C(4,2) = 6가지)
        for (let i = 0; i < remainders.length; i++) {
            for (let j = i + 1; j < remainders.length; j++) {
                const d1 = remainders[i];
                const d2 = remainders[j];

                // 나머지 2명이 힐러
                const healers = remainders.filter(idx => idx !== d1 && idx !== d2);
                const s1 = healers[0];
                const s2 = healers[1];

                const pTank = teamPlayers[t];
                const pDps1 = teamPlayers[d1];
                const pDps2 = teamPlayers[d2];
                const pSup1 = teamPlayers[s1];
                const pSup2 = teamPlayers[s2];

                const algoScore =
                    getPlayerAlgoScore(pTank, 'TANK') +
                    getPlayerAlgoScore(pDps1, 'DPS') +
                    getPlayerAlgoScore(pDps2, 'DPS') +
                    getPlayerAlgoScore(pSup1, 'SUPPORT') +
                    getPlayerAlgoScore(pSup2, 'SUPPORT');

                const realScore =
                    getPlayerRealScore(pTank, 'TANK') +
                    getPlayerRealScore(pDps1, 'DPS') +
                    getPlayerRealScore(pDps2, 'DPS') +
                    getPlayerRealScore(pSup1, 'SUPPORT') +
                    getPlayerRealScore(pSup2, 'SUPPORT');

                results.push({
                    assignment: {
                        TANK: [pTank],
                        DPS: [pDps1, pDps2],
                        SUPPORT: [pSup1, pSup2]
                    },
                    algoScore,
                    realScore
                });
            }
        }
    }

    return results;
};

/**
 * @description 선호 역할이 제대로 배치되었는지 확인한다.
 * @param assignment - 역할 배치
 * @returns 선호 역할 위반 수 (낮을수록 좋음)
 */
const countPreferenceViolations = (assignment: RoleAssignment): number => {
    let violations = 0;

    // 탱커가 다른 역할 선호하는지
    const tank = assignment.TANK[0];
    if (tank && (tank.dps.isPreferred || tank.sup.isPreferred) && !tank.tank.isPreferred) {
        violations++;
    }

    // 딜러가 다른 역할 선호하는지
    for (const dps of assignment.DPS) {
        if (dps && (dps.tank.isPreferred || dps.sup.isPreferred) && !dps.dps.isPreferred) {
            violations++;
        }
    }

    // 힐러가 다른 역할 선호하는지
    for (const sup of assignment.SUPPORT) {
        if (sup && (sup.tank.isPreferred || sup.dps.isPreferred) && !sup.sup.isPreferred) {
            violations++;
        }
    }

    return violations;
};

/**
 * @description 10명을 5:5로 나눈 모든 조합을 평가해 최적 밸런스를 찾는 훅.
 *
 * 최적화 우선순위:
 * 1. 선호 역할 위반 최소화
 * 2. 실제 점수 차이 최소화
 *
 * @returns balanceTeams 함수, 결과, 로딩 상태
 */
export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);

    const balanceTeams = useCallback((players: Player[]) => {
        if (players.length !== 10) {
            alert(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`);
            return;
        }

        setIsBalancing(true);

        setTimeout(() => {
            try {
                const n = 10;

                let bestRealDiff = Infinity;
                let bestViolations = Infinity;
                let finalTeamA: TeamResult | null = null;
                let finalTeamB: TeamResult | null = null;

                // 5명 조합 생성 (비트마스크 사용)
                const combinations: number[] = [];

                const generateCombos = (start: number, count: number, mask: number) => {
                    if (count === 0) {
                        combinations.push(mask);
                        return;
                    }
                    for (let i = start; i <= n - count; i++) {
                        generateCombos(i + 1, count - 1, mask | (1 << i));
                    }
                };

                // 첫 번째 플레이어를 A팀에 고정하여 중복 제거
                generateCombos(1, 4, 1);

                // 각 팀 조합 평가
                for (const maskA of combinations) {
                    const maskB = ((1 << n) - 1) ^ maskA;
                    const teamAPlayers: Player[] = [];
                    const teamBPlayers: Player[] = [];

                    for (let i = 0; i < n; i++) {
                        if ((maskA >> i) & 1) teamAPlayers.push(players[i]);
                        else teamBPlayers.push(players[i]);
                    }

                    // 각 팀의 모든 역할 배치 조합
                    const teamAAssignments = getAllTeamAssignments(teamAPlayers);
                    const teamBAssignments = getAllTeamAssignments(teamBPlayers);

                    // 모든 A팀 배치 × B팀 배치 조합 평가
                    for (const resA of teamAAssignments) {
                        for (const resB of teamBAssignments) {
                            const realDiff = Math.abs(resA.realScore - resB.realScore);
                            const violations =
                                countPreferenceViolations(resA.assignment) +
                                countPreferenceViolations(resB.assignment);

                            // 우선순위: 1) 선호 위반 최소 2) 실제 점수 차이 최소
                            const isBetter =
                                violations < bestViolations ||
                                (violations === bestViolations && realDiff < bestRealDiff);

                            if (isBetter) {
                                bestViolations = violations;
                                bestRealDiff = realDiff;

                                finalTeamA = {
                                    ...resA,
                                    name: "TEAM 1"
                                };
                                finalTeamB = {
                                    ...resB,
                                    name: "TEAM 2"
                                };

                                // 완벽한 밸런스면 조기 종료
                                if (violations === 0 && realDiff === 0) break;
                            }
                        }
                        if (bestViolations === 0 && bestRealDiff === 0) break;
                    }
                    if (bestViolations === 0 && bestRealDiff === 0) break;
                }

                if (finalTeamA && finalTeamB) {
                    setResult({
                        teamA: finalTeamA,
                        teamB: finalTeamB,
                        diff: bestRealDiff
                    });
                }

            } catch (error) {
                console.error("밸런싱 오류:", error);
                alert("계산 중 오류가 발생했습니다.");
            } finally {
                setIsBalancing(false);
            }
        }, 50);
    }, []);

    return { balanceTeams, result, setResult, isBalancing };
};
