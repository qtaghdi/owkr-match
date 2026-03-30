import { useState, useCallback } from 'react';
import { Player, TeamResult, MatchResultData, BalanceMetrics, Role, Rank, RoleAssignment } from '../types';

/**
 * @description 선호 역할 배치를 우선시키기 위한 보너스 점수 상수.
 */
const PREFERRED_BONUS = 100_000_000;

/**
 * @description 다른 역할이 선호일 때 배치를 억제하는 페널티 점수 상수.
 */
const PREFERRED_PENALTY = 50_000_000;

/**
 * @description 미배치(UNRANKED) 역할에 배치될 때 부여하는 페널티 점수 상수.
 */
const UNRANKED_PENALTY = 200_000_000;

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

    if (rank.tier === 'UNRANKED' || rank.score === 0) {
        score -= UNRANKED_PENALTY;
    }

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
 * @description 팀 내 역할별 점수의 표준편차를 계산한다. 팀 내 실력 편차가 클수록 높은 값 반환.
 * @param assignment - 역할 배치
 * @returns 팀 내 점수 표준편차 (낮을수록 좋음)
 */
const calculateTeamStdDev = (assignment: RoleAssignment): number => {
    const scores: number[] = [];

    if (assignment.TANK[0]) scores.push(getPlayerRealScore(assignment.TANK[0], 'TANK'));
    for (const dps of assignment.DPS) if (dps) scores.push(getPlayerRealScore(dps, 'DPS'));
    for (const sup of assignment.SUPPORT) if (sup) scores.push(getPlayerRealScore(sup, 'SUPPORT'));

    if (scores.length === 0) return 0;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
    return Math.sqrt(variance);
};

/**
 * @description 두 팀 간 마이크 미사용 플레이어 수 불균형을 계산한다.
 * @param teamAPlayers - A팀 플레이어 배열
 * @param teamBPlayers - B팀 플레이어 배열
 * @returns 마이크 미사용 플레이어 수 차이 (0이면 균등 분배)
 */
const calculateMicImbalance = (teamAPlayers: Player[], teamBPlayers: Player[]): number => {
    const noMicA = teamAPlayers.filter(p => p.noMic).length;
    const noMicB = teamBPlayers.filter(p => p.noMic).length;
    return Math.abs(noMicA - noMicB);
};

/**
 * @description 두 팀의 역할별 매치업 점수 차이를 계산한다.
 * 탱크vs탱크, 딜러 평균vs딜러 평균, 힐러 평균vs힐러 평균의 차이 합산.
 * @param assignA - A팀 역할 배치
 * @param assignB - B팀 역할 배치
 * @returns 역할별 매치업 점수 차이 합 (낮을수록 좋음)
 */
const calculateRoleMatchupDiff = (assignA: RoleAssignment, assignB: RoleAssignment): number => {
    const tankDiff = Math.abs(
        getPlayerRealScore(assignA.TANK[0], 'TANK') - getPlayerRealScore(assignB.TANK[0], 'TANK')
    );

    const dpsAvgA = assignA.DPS.reduce((sum, p) => sum + getPlayerRealScore(p, 'DPS'), 0) / assignA.DPS.length;
    const dpsAvgB = assignB.DPS.reduce((sum, p) => sum + getPlayerRealScore(p, 'DPS'), 0) / assignB.DPS.length;
    const dpsDiff = Math.abs(dpsAvgA - dpsAvgB);

    const supAvgA = assignA.SUPPORT.reduce((sum, p) => sum + getPlayerRealScore(p, 'SUPPORT'), 0) / assignA.SUPPORT.length;
    const supAvgB = assignB.SUPPORT.reduce((sum, p) => sum + getPlayerRealScore(p, 'SUPPORT'), 0) / assignB.SUPPORT.length;
    const supDiff = Math.abs(supAvgA - supAvgB);

    return tankDiff + dpsDiff + supDiff;
};

/**
 * @description 두 팀의 역할별 상세 점수 차이를 반환한다.
 * @param assignA - A팀 역할 배치
 * @param assignB - B팀 역할 배치
 * @returns 탱크, 딜러, 힐러 각각의 점수 차이
 */
const calculateRoleDiffs = (assignA: RoleAssignment, assignB: RoleAssignment) => {
    const tankDiff = Math.abs(
        getPlayerRealScore(assignA.TANK[0], 'TANK') - getPlayerRealScore(assignB.TANK[0], 'TANK')
    );

    const dpsAvgA = assignA.DPS.reduce((sum, p) => sum + getPlayerRealScore(p, 'DPS'), 0) / assignA.DPS.length;
    const dpsAvgB = assignB.DPS.reduce((sum, p) => sum + getPlayerRealScore(p, 'DPS'), 0) / assignB.DPS.length;
    const dpsDiff = Math.abs(dpsAvgA - dpsAvgB);

    const supAvgA = assignA.SUPPORT.reduce((sum, p) => sum + getPlayerRealScore(p, 'SUPPORT'), 0) / assignA.SUPPORT.length;
    const supAvgB = assignB.SUPPORT.reduce((sum, p) => sum + getPlayerRealScore(p, 'SUPPORT'), 0) / assignB.SUPPORT.length;
    const supDiff = Math.abs(supAvgA - supAvgB);

    return { tank: Math.round(tankDiff), dps: Math.round(dpsDiff), support: Math.round(supDiff) };
};

/**
 * @description 결과에 대한 밸런스 품질 지표를 계산한다.
 * @param resA - A팀 배치 결과
 * @param resB - B팀 배치 결과
 * @returns 밸런스 품질 지표
 */
const buildMetrics = (resA: AssignmentResult, resB: AssignmentResult): BalanceMetrics => ({
    totalDiff: Math.abs(resA.realScore - resB.realScore),
    roleDiffs: calculateRoleDiffs(resA.assignment, resB.assignment),
    teamStdDevs: [
        Math.round(calculateTeamStdDev(resA.assignment)),
        Math.round(calculateTeamStdDev(resB.assignment))
    ]
});

const MAX_ALTERNATIVES = 3;

interface Candidate {
    teamA: AssignmentResult;
    teamB: AssignmentResult;
    violations: number;
    compositeScore: number;
    realDiff: number;
}

/**
 * @description 10명을 5:5로 나눈 모든 조합을 평가해 최적 밸런스를 찾는 훅.
 *
 * 최적화 우선순위:
 * 1. 선호 역할 위반 최소화
 * 2. 합성 점수 최소화 (총점 차이 + 역할별 매치업 차이 + 팀 내 편차 + 마이크 불균형)
 *
 * @returns balanceTeams 함수, 결과/대안 목록, 로딩 상태
 */
export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);
    const [alternatives, setAlternatives] = useState<MatchResultData[]>([]);

    const balanceTeams = useCallback((players: Player[]) => {
        if (players.length !== 10) {
            alert(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`);
            return;
        }

        setIsBalancing(true);

        setTimeout(() => {
            try {
                const n = 10;

                // Top N 후보를 유지하는 배열 (정렬 상태)
                const topCandidates: Candidate[] = [];

                const insertCandidate = (candidate: Candidate) => {
                    // 삽입 위치 탐색
                    let pos = topCandidates.length;
                    for (let i = 0; i < topCandidates.length; i++) {
                        const existing = topCandidates[i];
                        const isBetter =
                            candidate.violations < existing.violations ||
                            (candidate.violations === existing.violations && candidate.compositeScore < existing.compositeScore);
                        if (isBetter) { pos = i; break; }
                    }
                    topCandidates.splice(pos, 0, candidate);
                    if (topCandidates.length > MAX_ALTERNATIVES) topCandidates.pop();
                };

                const getWorstComposite = () =>
                    topCandidates.length >= MAX_ALTERNATIVES
                        ? topCandidates[topCandidates.length - 1].compositeScore
                        : Infinity;

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

                    // 가지치기: 대략적 점수 차이가 현재 최악 후보의 3배를 넘으면 스킵
                    const roughScoreA = teamAPlayers.reduce((s, p) => s + Math.max(p.tank.score, p.dps.score, p.sup.score), 0);
                    const roughScoreB = teamBPlayers.reduce((s, p) => s + Math.max(p.tank.score, p.dps.score, p.sup.score), 0);
                    const roughDiff = Math.abs(roughScoreA - roughScoreB);
                    const worstComposite = getWorstComposite();
                    if (worstComposite < Infinity && roughDiff > worstComposite * 3) continue;

                    // 마이크 불균형은 팀 분할 단위이므로 한 번만 계산
                    const micImbalance = calculateMicImbalance(teamAPlayers, teamBPlayers);

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
                            const roleMatchupDiff = calculateRoleMatchupDiff(resA.assignment, resB.assignment);
                            const teamVariance = calculateTeamStdDev(resA.assignment) + calculateTeamStdDev(resB.assignment);

                            const compositeScore = realDiff + (roleMatchupDiff * 3) + (teamVariance * 0.5) + (micImbalance * 200);

                            insertCandidate({
                                teamA: resA,
                                teamB: resB,
                                violations,
                                compositeScore,
                                realDiff
                            });
                        }
                    }
                }

                if (topCandidates.length > 0) {
                    const toMatchResult = (c: Candidate, idx: number): MatchResultData => ({
                        teamA: { ...c.teamA, name: "TEAM 1" },
                        teamB: { ...c.teamB, name: "TEAM 2" },
                        diff: c.realDiff,
                        metrics: buildMetrics(c.teamA, c.teamB)
                    });

                    setResult(toMatchResult(topCandidates[0], 0));
                    setAlternatives(topCandidates.slice(1).map((c, i) => toMatchResult(c, i + 1)));
                }

            } catch (error) {
                console.error("밸런싱 오류:", error);
                alert("계산 중 오류가 발생했습니다.");
            } finally {
                setIsBalancing(false);
            }
        }, 50);
    }, []);

    return { balanceTeams, result, setResult, alternatives, setAlternatives, isBalancing };
};
