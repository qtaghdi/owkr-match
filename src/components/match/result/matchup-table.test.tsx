import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MatchResultData, Player, Rank } from '../../../types';
import MatchupTable from './matchup-table';

const createRank = (
    tier: Rank['tier'],
    div: number,
    state: Partial<Pick<Rank, 'isPreferred' | 'isAvoided'>> = {},
): Rank => ({
    tier,
    div,
    score: tier === 'UNRANKED' ? 0 : 2000,
    isPreferred: state.isPreferred ?? false,
    isAvoided: state.isAvoided ?? false,
});

const createPlayer = (id: number): Player => ({
    id,
    name: `VeryLongBattleTag${id}#12345`,
    discordName: `아주 긴 디스코드 닉네임 ${id}`,
    tank: createRank('BRONZE', 1, id === 1 ? { isPreferred: true } : {}),
    dps: createRank('DIAMOND', 3, id === 3 ? { isAvoided: true } : {}),
    sup: createRank('UNRANKED', 0),
    noMic: id === 1,
});

const players = Array.from({ length: 10 }, (_, index) => createPlayer(index + 1));

const matchResult: MatchResultData = {
    teamA: {
        name: 'TEAM 1',
        assignment: {
            TANK: [players[0]],
            DPS: [players[1], players[2]],
            SUPPORT: [players[3], players[4]],
        },
        realScore: 10000,
    },
    teamB: {
        name: 'TEAM 2',
        assignment: {
            TANK: [players[5]],
            DPS: [players[6], players[7]],
            SUPPORT: [players[8], players[9]],
        },
        realScore: 10000,
    },
    diff: 0,
};

const countMatches = (value: string, pattern: RegExp): number => value.match(pattern)?.length ?? 0;

describe('MatchupTable', () => {
    it('compact 모드에서는 플레이어마다 현재 배정 티어 하나만 표시한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                swapSource={null}
                displayMode="compact"
                interactive={false}
            />,
        );

        expect(markup).toContain('data-display-mode="compact"');
        expect(markup).not.toContain('data-rank-role');
        expect(countMatches(markup, /<img /g)).toBe(10);
        expect(markup).toContain('aria-label="마이크 미사용"');
    });

    it('전체 티어를 탱커, 딜러, 지원 순서로 표시하고 현재 배정 역할만 강조한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                swapSource={null}
                displayMode="all"
                interactive={false}
            />,
        );

        expect(markup).toContain('data-display-mode="all"');
        expect(markup).toMatch(/data-rank-role="TANK"[\s\S]*data-rank-role="DPS"[\s\S]*data-rank-role="SUPPORT"/);
        expect(countMatches(markup, /data-rank-role=/g)).toBe(30);
        expect(countMatches(markup, /data-assigned="true"/g)).toBe(10);
        expect(countMatches(markup, /ring-blue-400\/80/g)).toBe(2);
        expect(countMatches(markup, /ring-orange-400\/80/g)).toBe(4);
        expect(countMatches(markup, /ring-emerald-400\/80/g)).toBe(4);
    });

    it('선호·비선호·미배치·마이크 상태와 긴 이름을 전체 티어 모드에 유지한다', () => {
        const markup = renderToStaticMarkup(
            <MatchupTable
                matchResult={matchResult}
                swapSource={null}
                displayMode="all"
                interactive={false}
            />,
        );

        expect(markup).toContain('탱커 브론즈 1 디비전, 선호 역할, 현재 배정 역할');
        expect(markup).toContain('딜러 다이아 3 디비전, 비선호 역할, 현재 배정 역할');
        expect(markup).toContain('지원 미배치');
        expect(markup).toContain('aria-label="마이크 미사용"');
        expect(markup).toContain('아주 긴 디스코드 닉네임 1');
        expect(markup).toContain('VeryLongBattleTag1#12345');
    });
});
