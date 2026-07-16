export type MatchupDisplayMode = 'compact' | 'all';

export const DEFAULT_SHOW_ALL_TIERS = false;

/**
 * @description 화면 티어 모드와 무관하게 이미지 내보내기는 compact 모드로 고정한다.
 */
export const getMatchupDisplayModes = (showAllTiers: boolean): {
    screen: MatchupDisplayMode;
    export: MatchupDisplayMode;
} => ({
    screen: showAllTiers ? 'all' : 'compact',
    export: 'compact',
});
