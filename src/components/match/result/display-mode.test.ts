import { describe, expect, it } from 'vitest';
import { DEFAULT_SHOW_ALL_TIERS, getMatchupDisplayModes } from './display-mode';

describe('getMatchupDisplayModes', () => {
    it('기본 화면과 이미지 내보내기를 compact 모드로 시작한다', () => {
        expect(DEFAULT_SHOW_ALL_TIERS).toBe(false);
        expect(getMatchupDisplayModes(DEFAULT_SHOW_ALL_TIERS)).toEqual({
            screen: 'compact',
            export: 'compact',
        });
    });

    it('전체 티어 화면에서도 이미지 내보내기는 compact 모드를 유지한다', () => {
        expect(getMatchupDisplayModes(true)).toEqual({
            screen: 'all',
            export: 'compact',
        });
    });
});
