import { useState, useCallback } from 'react';
import { Player, RoleAssignment, TeamResult, MatchResultData, Role, Rank } from '../types';

const ROLE_SLOTS: Role[] = ["TANK", "DPS", "DPS", "SUPPORT", "SUPPORT"];

const getRoleData = (player: Player, role: Role): Rank => {
    if (role === 'TANK') return player.tank;
    if (role === 'DPS') return player.dps;
    if (role === 'SUPPORT') return player.sup;
    return { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };
};

export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);

    const getBestRoleAssignment = useCallback((teamPlayers: Player[]) => {
        const permute = (arr: Player[]): Player[][] => {
            if (arr.length === 0) return [[]];
            const first = arr[0];
            const rest = arr.slice(1);
            const permsWithoutFirst = permute(rest);
            const allPermutations: Player[][] = [];
            permsWithoutFirst.forEach((perm) => {
                for (let i = 0; i <= perm.length; i++) {
                    const withFirst = [...perm.slice(0, i), first, ...perm.slice(i)];
                    allPermutations.push(withFirst);
                }
            });
            return allPermutations;
        };

        let bestAssignment: RoleAssignment | null = null;
        let maxAlgoScore = -Infinity;
        let bestRealScore = 0;

        const permutations = permute(teamPlayers);

        for (const perm of permutations) {
            let currentAlgoScore = 0;
            let currentRealScore = 0;

            const currentAssignment: RoleAssignment = { TANK: [], DPS: [], SUPPORT: [] };

            for (let i = 0; i < 5; i++) {
                const role = ROLE_SLOTS[i];
                const player = perm[i];
                const { score, isPreferred } = getRoleData(player, role);

                currentRealScore += score;
                currentAlgoScore += score;

                if (isPreferred) currentAlgoScore += 100000000;

                const prefersOther =
                    (role !== 'TANK' && player.tank?.isPreferred) ||
                    (role !== 'DPS' && player.dps?.isPreferred) ||
                    (role !== 'SUPPORT' && player.sup?.isPreferred);

                if (prefersOther) currentAlgoScore -= 50000000;

                currentAssignment[role].push(player);
            }

            if (currentAlgoScore > maxAlgoScore) {
                maxAlgoScore = currentAlgoScore;
                bestAssignment = currentAssignment;
                bestRealScore = currentRealScore;
            }
        }

        return {
            assignment: bestAssignment!,
            algoScore: maxAlgoScore,
            realScore: bestRealScore
        };
    }, []);

    const balanceTeams = useCallback((players: Player[]) => {
        if (players.length !== 10) {
            alert(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`);
            return;
        }

        setIsBalancing(true);

        setTimeout(() => {
            try {
                let finalTeamA: TeamResult | null = null;
                let finalTeamB: TeamResult | null = null;
                let minDiff = Infinity;
                let bestAlgoDiff = Infinity;

                const combine = (src: Player[], len: number, start: number, picked: Player[]) => {
                    if (len === 0) {
                        const teamA = picked;
                        const teamB = src.filter(p => !teamA.includes(p));

                        const resA = getBestRoleAssignment(teamA);
                        const resB = getBestRoleAssignment(teamB);

                        if (resA.assignment && resB.assignment) {
                            const algoDiff = Math.abs(resA.algoScore - resB.algoScore);
                            const realDiff = Math.abs(resA.realScore - resB.realScore);

                            if (algoDiff < bestAlgoDiff || (algoDiff === bestAlgoDiff && realDiff < minDiff)) {
                                bestAlgoDiff = algoDiff;
                                minDiff = realDiff;

                                finalTeamA = { ...resA, name: "TEAM 1" };
                                finalTeamB = { ...resB, name: "TEAM 2" };
                            }
                        }
                        return;
                    }

                    for (let i = start; i <= src.length - len; i++) {
                        combine(src, len - 1, i + 1, [...picked, src[i]]);
                    }
                };

                combine(players, 5, 0, []);

                if (finalTeamA && finalTeamB) {
                    setResult({
                        teamA: finalTeamA!,
                        teamB: finalTeamB!,
                        diff: minDiff
                    });
                } else {
                    alert("유효한 팀 조합을 찾지 못했습니다.");
                }
            } catch (error) {
                console.error("Balancing Error:", error);
                alert("계산 중 오류가 발생했습니다.");
            } finally {
                setIsBalancing(false);
            }
        }, 50);
    }, [getBestRoleAssignment]);

    return { balanceTeams, result, setResult, isBalancing };
};