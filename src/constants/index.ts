import { Rank } from "../types";

export const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHAMPION"];

export const TIER_LABEL_MAP: Record<string, string> = {
    BRONZE: "브론즈", SILVER: "실버", GOLD: "골드", PLATINUM: "플레",
    DIAMOND: "다이아", MASTER: "마스터", GRANDMASTER: "그마", CHAMPION: "챔피언",
    UNRANKED: "미배치"
};

export const getScore = (tierIdx: number, div: string | number): number => {
    if (tierIdx === -1) return 2250;
    return (tierIdx * 600) + ((6 - Number(div)) * 100);
};

export const formatRank = (rankObj: Rank): string => {
    if (!rankObj || rankObj.tier === 'UNRANKED') return "-";
    const shortName = TIER_LABEL_MAP[rankObj.tier]?.[0] || "?";
    return `${shortName}${rankObj.div}${rankObj.isPreferred ? '★' : ''}`;
};