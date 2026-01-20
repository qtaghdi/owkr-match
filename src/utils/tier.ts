/**
 * @description 티어 이미지 경로를 반환하는 유틸리티.
 * @param tier - 티어 문자열
 * @returns 이미지 경로 또는 undefined
 */
export const getTierImage = (tier: string): string | undefined => {
    if (!tier) return undefined;
    if (tier === 'UNRANKED') return '/tier/unrank.png';
    return `/tier/${tier.toLowerCase()}.png`;
};
