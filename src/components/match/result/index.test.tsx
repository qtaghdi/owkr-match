import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MatchResultData, Player, Rank } from '../../../types';
import MatchResult from './index';

const rank: Rank = {
    tier: 'GOLD',
    div: 3,
    score: 1400,
    isPreferred: false,
    isAvoided: false,
};

const createPlayer = (id: number): Player => ({
    id,
    name: `Player${id}#1234`,
    tank: rank,
    dps: rank,
    sup: rank,
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

describe('MatchResult', () => {
    it('탱·딜·힐 티어 스위치를 OFF로 시작하고 화면 영역을 이미지 복사 대상으로 사용한다', () => {
        const markup = renderToStaticMarkup(
            <MatchResult
                matchResult={matchResult}
                onSlotClick={vi.fn()}
                swapSource={null}
            />,
        );

        expect(markup).toContain('role="switch"');
        expect(markup).toContain('aria-checked="false"');
        expect(markup).toContain('탱·딜·힐 티어 표시');
        expect(markup).not.toContain('data-export-render');
        expect(markup).not.toContain('data-display-mode');
    });
});
