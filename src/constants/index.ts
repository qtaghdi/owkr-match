import { Rank, Tier } from "../types";

/**
 * @description 커스텀 게임 코드.
 */
export const CUSTOM_GAME_CODE = 'SW9P0';

/**
 * @description 티어 순서를 점수 계산 기준으로 고정한 목록.
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
 * @description 티어 코드와 UI 표기를 연결하는 라벨 맵.
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
 * @description 비선형 티어 기본 점수 테이블. 고티어일수록 간격이 커져 실력 격차를 반영한다.
 */
const TIER_BASE_SCORES = [0, 500, 1100, 1800, 2600, 3600, 4800, 6200];

/**
 * @description 티어/등급을 비선형 점수로 변환해 로직 전반에서 비교에 사용한다.
 * @param tierIdx - 티어 인덱스 (0~7), -1이면 기본값 반환
 * @param div - 등급 (1~5)
 * @returns 계산된 점수
 */
export const getScore = (tierIdx: number, div: string | number): number => {
    if (tierIdx === -1) return 2160; // 플레 3 기준 기본값
    const base = TIER_BASE_SCORES[tierIdx] ?? 0;
    const nextBase = TIER_BASE_SCORES[tierIdx + 1] ?? base + 500;
    const tierGap = nextBase - base;
    return base + Math.round((tierGap / 5) * (5 - Number(div)));
};

/**
 * @description Rank 정보를 UI용 짧은 문자열로 변환한다.
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
 * @description 점수를 대략적인 티어 라벨로 변환해 표시용으로 사용한다.
 * @param score - 점수
 * @returns 티어 라벨 (예: "다이아", "플레")
 */
export const scoreToTierLabel = (score: number): string => {
    let tierIdx = 0;
    for (let i = TIER_BASE_SCORES.length - 1; i >= 0; i--) {
        if (score >= TIER_BASE_SCORES[i]) {
            tierIdx = i;
            break;
        }
    }
    return TIER_LABEL_MAP[TIERS[tierIdx]] || "미배치";
};
