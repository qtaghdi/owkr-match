import {useCallback, useState} from 'react';
import {MatchResultData, Player, Rank, Role, TeamResult} from '../types';

const PREFERRED_BONUS = 100_000_000;
const PREFERRED_PENALTY = 50_000_000;

export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);

    const getPlayerRoleScore = (player: Player, role: Role): number => {
        let rank: Rank | undefined;
        if (role === 'TANK') rank = player.tank;
        else if (role === 'DPS') rank = player.dps;
        else if (role === 'SUPPORT') rank = player.sup;

        if (!rank) return 0;

        let score = rank.score;

        if (rank.isPreferred) {
            score += PREFERRED_BONUS;
        }

        const prefersOther =
            (role !== 'TANK' && player.tank?.isPreferred) ||
            (role !== 'DPS' && player.dps?.isPreferred) ||
            (role !== 'SUPPORT' && player.sup?.isPreferred);

        if (prefersOther) {
            score -= PREFERRED_PENALTY;
        }

        return score;
    };

    const getBestTeamAssignment = useCallback((teamPlayers: Player[]) => {
        let bestScore = -Infinity;
        let bestRealScore = 0;
        let bestAssignment = { TANK: [] as Player[], DPS: [] as Player[], SUPPORT: [] as Player[] };

        for (let t = 0; t < 5; t++) {
            const remainders = [0, 1, 2, 3, 4].filter(idx => idx !== t);

            for (let i = 0; i < remainders.length; i++) {
                for (let j = i + 1; j < remainders.length; j++) {
                    const d1 = remainders[i];
                    const d2 = remainders[j];

                    const healers = remainders.filter(idx => idx !== d1 && idx !== d2);
                    const s1 = healers[0];
                    const s2 = healers[1];
                    const pTank = teamPlayers[t];
                    const pDps1 = teamPlayers[d1];
                    const pDps2 = teamPlayers[d2];
                    const pSup1 = teamPlayers[s1];
                    const pSup2 = teamPlayers[s2];

                    const currentAlgoScore =
                        getPlayerRoleScore(pTank, 'TANK') +
                        getPlayerRoleScore(pDps1, 'DPS') +
                        getPlayerRoleScore(pDps2, 'DPS') +
                        getPlayerRoleScore(pSup1, 'SUPPORT') +
                        getPlayerRoleScore(pSup2, 'SUPPORT');

                    if (currentAlgoScore > bestScore) {
                        bestScore = currentAlgoScore;

                        bestRealScore = pTank.tank.score +
                            pDps1.dps.score + pDps2.dps.score +
                            pSup1.sup.score + pSup2.sup.score;
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
    }, []);

    const balanceTeams = useCallback((players: Player[]) => {
        if (players.length !== 10) {
            alert(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`);
            return;
        }

        setIsBalancing(true);

        setTimeout(() => {
            try {

                const n = 10;
                const k = 5;
                const teamCache = new Map<number, ReturnType<typeof getBestTeamAssignment>>();

                let minDiff = Infinity;
                let bestAlgoDiff = Infinity;
                let finalTeamA: TeamResult | null = null;
                let finalTeamB: TeamResult | null = null;

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

                generateCombos(1, 4, 1);

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

                    if (algoDiff < bestAlgoDiff || (algoDiff === bestAlgoDiff && realDiff < minDiff)) {
                        bestAlgoDiff = algoDiff;
                        minDiff = realDiff;

                        finalTeamA = { ...resA, name: "TEAM 1" };
                        finalTeamB = { ...resB, name: "TEAM 2" };

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
                console.error("Balancing Error:", error);
                alert("계산 중 오류가 발생했습니다.");
            } finally {
                setIsBalancing(false);
            }
        }, 50);
    }, [getBestTeamAssignment]);

    return { balanceTeams, result, setResult, isBalancing };
};