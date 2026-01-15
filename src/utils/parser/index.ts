import { Player, Rank } from "src/types";
import { TIERS, TIER_LABEL_MAP, getScore } from "src/constants";

export const parseLineToPlayer = (line: string): Player | null => {
    const cleanLine = line.trim();
    if (!cleanLine.includes('#') && !cleanLine.match(/[0-9]{4,}/)) return null;

    const nameMatch = cleanLine.match(/^([^\s/]+\s*#\s*\d+)/) || cleanLine.match(/^([^\s/]+)/);
    if (!nameMatch) return null;

    const name = nameMatch[0].replace(/\s+/g, '');
    const remainText = cleanLine.slice(nameMatch[0].length).trim();
    const normalizedText = remainText.replace(/[/,]/g, ' ');

    const regex = /(탱(?:커)?|딜(?:러)?|힐(?:러)?|t|d|s)?\s*([가-힣a-zA-Z]+)\s*([0-5])?\s*(!)?/gi;
    const matches = [...normalizedText.matchAll(regex)];

    const createRank = (tierStr: string, divStr: string = "3", isPreferred: boolean): Rank => {
        const tierIdx = TIERS.findIndex(t =>
            t.startsWith(tierStr.toUpperCase()) ||
            TIER_LABEL_MAP[t].startsWith(tierStr) ||
            (t === 'PLATINUM' && ['플', '플래'].includes(tierStr))
        );
        if (tierIdx === -1) return { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };
        return { tier: TIERS[tierIdx], div: divStr, score: getScore(tierIdx, divStr), isPreferred };
    };

    let tank: Rank = { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };
    let dps: Rank = { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };
    let sup: Rank = { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };

    let autoIndex = 0;

    for (const m of matches) {
        const roleStr = m[1] ? m[1].toLowerCase() : null;
        const tierStr = m[2];
        const divStr = m[3] || "3";
        const isPreferred = !!m[4];

        if (tierStr.match(/미배치|unranked/i)) {
            if (!roleStr) autoIndex++;
            continue;
        }

        const rankObj = createRank(tierStr, divStr, isPreferred);
        if (rankObj.tier === 'UNRANKED') continue;

        if (roleStr) {
            if (roleStr.match(/^(탱|t)/)) tank = rankObj;
            else if (roleStr.match(/^(딜|d)/)) dps = rankObj;
            else if (roleStr.match(/^(힐|s)/)) sup = rankObj;
        } else {
            if (autoIndex === 0) tank = rankObj;
            else if (autoIndex === 1) dps = rankObj;
            else if (autoIndex === 2) sup = rankObj;
            autoIndex++;
        }
    }

    if (tank.score === 0 && dps.score === 0 && sup.score === 0) return null;

    return { id: Date.now() + Math.random(), name, tank, dps, sup };
};