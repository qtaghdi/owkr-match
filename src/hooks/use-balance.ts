import { useState, useCallback } from 'react';
import { Player, TeamResult, MatchResultData, Role, Rank, RoleAssignment } from '../types';

/**
 * 선호 역할에 배치될 때 추가되는 보너스 점수
 * 매우 큰 값으로 설정하여 선호 역할 배치를 우선시
 */
const PREFERRED_BONUS = 100_000_000;

/**
 * 다른 역할이 선호로 표시되어 있을 때의 페널티
 * 선호하지 않는 역할에 배치되는 것을 방지
 */
const PREFERRED_PENALTY = 50_000_000;

/**
 * 플레이어의 특정 역할에 대한 알고리즘 점수 계산
 *
 * 점수 구성:
 * - 기본 점수: 해당 역할의 티어 기반 점수
 * - 선호 보너스: 해당 역할이 선호 역할이면 +1억
 * - 비선호 페널티: 다른 역할이 선호로 표시되어 있으면 -5천만
 *
 * @param player - 플레이어 객체
 * @param role - 계산할 역할
 * @returns 알고리즘 점수
 */
const getPlayerRoleScore = (player: Player, role: Role): number => {
    const rankMap: Record<Role, Rank> = {
        'TANK': player.tank,
        'DPS': player.dps,
        'SUPPORT': player.sup
    };

    const rank = rankMap[role];
    if (!rank) return 0;

    let score = rank.score;

    // 선호 역할 보너스
    if (rank.isPreferred) {
        score += PREFERRED_BONUS;
    }

    // 다른 역할이 선호일 때 페널티
    const otherRoles: Role[] = (['TANK', 'DPS', 'SUPPORT'] as Role[]).filter(r => r !== role);
    const prefersOther = otherRoles.some(r => rankMap[r]?.isPreferred);

    if (prefersOther) {
        score -= PREFERRED_PENALTY;
    }

    return score;
};

/**
 * 팀 내 최적의 역할 배치를 찾는 함수
 *
 * 5명의 플레이어를 1탱 2딜 2힐로 배치하는 모든 조합(60가지)을 평가하여
 * 알고리즘 점수가 가장 높은 배치를 반환
 *
 * @param teamPlayers - 5명의 플레이어 배열
 * @returns 최적 배치, 알고리즘 점수, 실제 점수
 */
const getBestTeamAssignment = (teamPlayers: Player[]): {
    assignment: RoleAssignment;
    algoScore: number;
    realScore: number;
} => {
    let bestScore = -Infinity;
    let bestRealScore = 0;
    let bestAssignment: RoleAssignment = {
        TANK: [],
        DPS: [],
        SUPPORT: []
    };

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

                // 알고리즘 점수 계산 (선호도 보너스/페널티 포함)
                const currentAlgoScore =
                    getPlayerRoleScore(pTank, 'TANK') +
                    getPlayerRoleScore(pDps1, 'DPS') +
                    getPlayerRoleScore(pDps2, 'DPS') +
                    getPlayerRoleScore(pSup1, 'SUPPORT') +
                    getPlayerRoleScore(pSup2, 'SUPPORT');

                if (currentAlgoScore > bestScore) {
                    bestScore = currentAlgoScore;

                    // 실제 점수 계산 (순수 티어 기반)
                    const currentRealScore =
                        pTank.tank.score +
                        pDps1.dps.score + pDps2.dps.score +
                        pSup1.sup.score + pSup2.sup.score;

                    bestRealScore = currentRealScore;
                    bestAssignment = {
                        TANK: [pTank],
                        DPS: [pDps1, pDps2],
                        SUPPORT: [pSup1, pSup2]
                    };
                }
            }
        }
    }

    return {
        assignment: bestAssignment,
        algoScore: bestScore,
        realScore: bestRealScore
    };
};

/**
 * 10명 플레이어 팀 밸런싱 훅
 *
 * 알고리즘 개요:
 * 1. 10명을 5:5로 나누는 모든 조합 생성 (C(10,5)/2 = 126가지, 중복 제거)
 * 2. 각 팀에서 최적의 역할 배치 계산
 * 3. 알고리즘 점수 차이가 가장 작은 조합 선택
 * 4. 동점 시 실제 점수 차이가 작은 것 우선
 *
 * @returns balanceTeams 함수, 결과, 로딩 상태
 */
export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);

    /**
     * 10명의 플레이어를 두 팀으로 밸런싱
     *
     * @param players - 정확히 10명의 플레이어 배열
     */
    const balanceTeams = useCallback((players: Player[]) => {
        if (players.length !== 10) {
            alert(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`);
            return;
        }

        setIsBalancing(true);

        // UI 블로킹 방지를 위한 비동기 처리
        setTimeout(() => {
            try {
                const n = 10;

                let minDiff = Infinity;
                let bestAlgoDiff = Infinity;
                let finalTeamA: TeamResult | null = null;
                let finalTeamB: TeamResult | null = null;

                // 5명 조합 생성 (비트마스크 사용)
                // 첫 번째 플레이어는 항상 A팀에 포함시켜 중복 제거
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

                // 첫 번째 플레이어(인덱스 0)를 A팀에 고정하고 나머지 4명 선택
                generateCombos(1, 4, 1);

                // 각 조합 평가
                for (const maskA of combinations) {
                    const maskB = ((1 << n) - 1) ^ maskA;
                    const teamAPlayers: Player[] = [];
                    const teamBPlayers: Player[] = [];

                    for (let i = 0; i < n; i++) {
                        if ((maskA >> i) & 1) teamAPlayers.push(players[i]);
                        else teamBPlayers.push(players[i]);
                    }

                    const resA = getBestTeamAssignment(teamAPlayers);
                    const resB = getBestTeamAssignment(teamBPlayers);

                    const algoDiff = Math.abs(resA.algoScore - resB.algoScore);
                    const realDiff = Math.abs(resA.realScore - resB.realScore);

                    // 알고리즘 점수 차이 우선, 동점시 실제 점수 차이
                    if (algoDiff < bestAlgoDiff || (algoDiff === bestAlgoDiff && realDiff < minDiff)) {
                        bestAlgoDiff = algoDiff;
                        minDiff = realDiff;

                        finalTeamA = { ...resA, name: "TEAM 1" };
                        finalTeamB = { ...resB, name: "TEAM 2" };

                        // 완벽한 밸런스 찾으면 조기 종료
                        if (algoDiff === 0 && realDiff === 0) break;
                    }
                }

                if (finalTeamA && finalTeamB) {
                    setResult({
                        teamA: finalTeamA,
                        teamB: finalTeamB,
                        diff: minDiff
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
