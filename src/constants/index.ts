import { Rank, Tier } from "../types";

/**
 * 오버워치 티어 목록 (낮은 순 → 높은 순)
 * 인덱스가 점수 계산에 사용됨 (0: 브론즈, 7: 챔피언)
 */
export const TIERS: Tier[] = [
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
    "MASTER",
    "GRANDMASTER",
    "CHAMPION"
];

/**
 * 티어별 한글 라벨 매핑
 */
export const TIER_LABEL_MAP: Record<string, string> = {
    BRONZE: "브론즈",
    SILVER: "실버",
    GOLD: "골드",
    PLATINUM: "플레",
    DIAMOND: "다이아",
    MASTER: "마스터",
    GRANDMASTER: "그마",
    CHAMPION: "챔피언",
    UNRANKED: "미배치"
};

/**
 * 티어와 등급을 기반으로 점수 계산
 *
 * 점수 공식: (티어 인덱스 × 600) + ((6 - 등급) × 100)
 *
 * 예시:
 * - 브론즈 5: 0 × 600 + (6-5) × 100 = 100
 * - 다이아 1: 4 × 600 + (6-1) × 100 = 2900
 * - 챔피언 1: 7 × 600 + (6-1) × 100 = 4700
 *
 * @param tierIdx - 티어 인덱스 (0~7), -1이면 기본값 반환
 * @param div - 등급 (1~5)
 * @returns 계산된 점수
 */
export const getScore = (tierIdx: number, div: string | number): number => {
    if (tierIdx === -1) return 2250; // 플레 3 기준 기본값
    return (tierIdx * 600) + ((6 - Number(div)) * 100);
};

/**
 * Rank 객체를 짧은 문자열로 포맷팅
 *
 * @param rankObj - 랭크 객체
 * @returns 포맷된 문자열 (예: "다3", "플1★", "-")
 *
 * @example
 * formatRank({ tier: 'DIAMOND', div: 3, score: 2700, isPreferred: true })
 * // => "다3★"
 */
export const formatRank = (rankObj: Rank): string => {
    if (!rankObj || rankObj.tier === 'UNRANKED') return "-";
    const shortName = TIER_LABEL_MAP[rankObj.tier]?.[0] || "?";
    return `${shortName}${rankObj.div}${rankObj.isPreferred ? '★' : ''}`;
};

/**
 * 점수를 티어 문자열로 변환 (대략적인 표시용)
 *
 * @param score - 점수
 * @returns 티어 라벨 (예: "다이아", "플레")
 */
export const scoreToTierLabel = (score: number): string => {
    const tierIdx = Math.floor(score / 600);
    const clampedIdx = Math.max(0, Math.min(tierIdx, TIERS.length - 1));
    return TIER_LABEL_MAP[TIERS[clampedIdx]] || "미배치";
};
