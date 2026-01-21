import { Player, Rank } from "src/types";
import { TIERS, TIER_LABEL_MAP, getScore } from "src/constants";

/**
 * @description 티어 문자열을 정규화해 TIERS 인덱스로 매핑한다.
 * @param tierStr - 티어 문자열 (예: "다이아", "다", "플레", "그마", "마스터" 등)
 * @returns 티어 인덱스 (0-7), 찾지 못하면 -1
 */
const findTierIndex = (tierStr: string): number => {
    const normalized = tierStr.toLowerCase().trim();

    const tierMap: Record<string, number> = {
        // 브론즈 (0)
        '브론즈': 0, '브론': 0, '브': 0, 'bronze': 0, 'br': 0,
        // 실버 (1)
        '실버': 1, '실': 1, 'silver': 1, 'si': 1,
        // 골드 (2)
        '골드': 2, '골': 2, 'gold': 2, 'go': 2,
        // 플래티넘 (3)
        '플래티넘': 3, '플레티넘': 3, '플래': 3, '플레': 3, '플': 3, 'platinum': 3, 'plat': 3, 'pl': 3,
        // 다이아몬드 (4)
        '다이아몬드': 4, '다이아': 4, '다이': 4, '다': 4, 'diamond': 4, 'dia': 4, 'di': 4,
        // 마스터 (5)
        '마스터': 5, '마스': 5, '마': 5, 'master': 5, 'ma': 5,
        // 그랜드마스터 (6)
        '그랜드마스터': 6, '그마': 6, '그': 6, 'grandmaster': 6, 'gm': 6,
        // 챔피언 (7)
        '챔피언': 7, '챔피': 7, '챔': 7, 'champion': 7, 'champ': 7, 'ch': 7
    };

    if (tierMap[normalized] !== undefined) {
        return tierMap[normalized];
    }

    // 부분 매칭 시도
    for (const [key, idx] of Object.entries(tierMap)) {
        if (normalized.startsWith(key) || key.startsWith(normalized)) {
            return idx;
        }
    }

    return -1;
};

/**
 * @description 역할 문자열을 표준 역할 타입으로 정규화한다.
 * @param roleStr - 역할 문자열 (예: "탱커", "탱", "딜러", "힐러", 이모지 등)
 * @returns 'TANK' | 'DPS' | 'SUPPORT' | null
 */
const parseRole = (roleStr: string): 'TANK' | 'DPS' | 'SUPPORT' | null => {
    const normalized = roleStr.toLowerCase().trim();

    // 이모지 패턴 먼저 체크 (더 구체적인 패턴)
    if (normalized.includes('ob_tank')) return 'TANK';
    if (normalized.includes('oc_damage')) return 'DPS';
    if (normalized.includes('od_support')) return 'SUPPORT';

    // 한글 패턴
    if (normalized.includes('탱커') || normalized.includes('탱')) return 'TANK';
    if (normalized.includes('딜러') || normalized.includes('딜')) return 'DPS';
    if (normalized.includes('힐러') || normalized.includes('힐')) return 'SUPPORT';

    // 영문 단축키 (단독 문자는 정확히 매칭)
    if (normalized === 't' || normalized.includes('tank')) return 'TANK';
    if (normalized === 'd' || normalized.includes('dps') || normalized.includes('damage')) return 'DPS';
    if (normalized === 's' || normalized.includes('support') || normalized.includes('sup') || normalized.includes('heal')) return 'SUPPORT';

    return null;
};

/**
 * @description 괄호 안 티어 표기를 추출해 예상 티어로 해석한다.
 * @param text - 괄호를 포함한 텍스트
 * @returns 예상 티어 문자열 또는 null
 */
const extractEstimatedTier = (text: string): string | null => {
    const match = text.match(/\(([가-힣a-zA-Z]+)\)/);
    if (!match) return null;

    const inner = match[1];
    // "배치", "배치중", "예상" 등은 무시
    if (inner.match(/배치|예상|중/)) return null;

    return inner;
};

/**
 * @description 단일 역할 세그먼트를 파싱해 티어/등급/선호 여부를 만든다.
 * @param segment - 파싱할 세그먼트 문자열
 * @returns { tierIdx, div, isPreferred } 또는 null
 */
const parseRankSegment = (segment: string): { tierIdx: number; div: number; isPreferred: boolean } | null => {
    const isPreferred = segment.includes('!');
    const cleanSegment = segment.replace(/!/g, '').trim();

    // "미배치(골)" 같은 패턴 처리
    if (cleanSegment.match(/미배치|unranked/i)) {
        const estimated = extractEstimatedTier(cleanSegment);
        if (estimated) {
            const tierIdx = findTierIndex(estimated);
            if (tierIdx !== -1) {
                return { tierIdx, div: 3, isPreferred }; // 예상 티어는 기본 3등급
            }
        }
        return null; // 완전히 미배치
    }

    // "(예상)" 패턴 제거
    const withoutEstimate = cleanSegment.replace(/\(예상\)/g, '').trim();

    // 일반 패턴: "다이아3", "다3", "플레4", "마1" 등
    const tierDivMatch = withoutEstimate.match(/^([가-힣a-zA-Z]+)\s*(\d)?$/);
    if (tierDivMatch) {
        const tierIdx = findTierIndex(tierDivMatch[1]);
        const div = tierDivMatch[2] ? parseInt(tierDivMatch[2]) : 3;
        if (tierIdx !== -1) {
            return { tierIdx, div, isPreferred };
        }
    }

    return null;
};

/**
 * @description 티어/등급/선호를 받아 Rank 객체로 변환한다.
 * @param tierIdx - 티어 인덱스 (0-7)
 * @param div - 등급 (1-5)
 * @param isPreferred - 선호 역할 여부
 * @returns Rank 객체
 */
const createRank = (tierIdx: number, div: number, isPreferred: boolean): Rank => {
    if (tierIdx === -1) {
        return { tier: 'UNRANKED', div: 0, score: 0, isPreferred: false };
    }
    return {
        tier: TIERS[tierIdx],
        div,
        score: getScore(tierIdx, div),
        isPreferred
    };
};

/**
 * @description 미배치 상태의 기본 Rank 객체를 만든다.
 * @returns 미배치 상태의 Rank 객체
 */
const createUnrankedRank = (): Rank => ({
    tier: 'UNRANKED',
    div: 0,
    score: 0,
    isPreferred: false
});

/**
 * @description 티어 이모지를 티어 문자열로 변환한다.
 * @param emoji - 이모지 문자열 (예: "ow_Te_diamond", "ow_Tf_master")
 * @returns 티어 문자열 또는 null
 */
const emojiToTier = (emoji: string): string | null => {
    const lower = emoji.toLowerCase();
    if (lower.includes('bronze')) return '브';
    if (lower.includes('silver')) return '실';
    if (lower.includes('gold')) return '골';
    if (lower.includes('plat')) return '플';
    if (lower.includes('diamond')) return '다';
    if (lower.includes('master')) return '마';
    if (lower.includes('grand')) return '그';
    if (lower.includes('champ')) return '챔';
    return null;
};

/**
 * @description 디스코드 이모지(:xxx:)를 제거하되 역할 이모지 정보는 추출하고 티어로 변환한다.
 * @param text - 원본 텍스트
 * @returns { cleanText, emojiRoles } 이모지 제거된 텍스트와 역할 정보
 */
const extractEmojiInfo = (text: string): { cleanText: string; emojiRoles: ('TANK' | 'DPS' | 'SUPPORT')[] } => {
    const emojiRoles: ('TANK' | 'DPS' | 'SUPPORT')[] = [];

    // 슬래시로 나누어 각 파트의 역할 이모지 추출
    const parts = text.split('/');
    for (const part of parts) {
        const roleMatch = part.match(/:p(ob_tank|oc_damage|od_support):/i);
        if (roleMatch) {
            const role = parseRole(roleMatch[1]);
            if (role) emojiRoles.push(role);
        }
    }

    // 티어 이모지를 티어 문자열로 변환: ":ow_Te_diamond: 3" -> "다3"
    // 먼저 역할+티어 이모지 조합 처리: ":pob_Tank::ow_Te_diamond: 3" -> "다3"
    let cleanText = text.replace(/:p(ob_tank|oc_damage|od_support):/gi, ''); // 역할 이모지 제거

    // 티어 이모지 변환
    cleanText = cleanText.replace(/:ow_[A-Za-z_]+:\s*(\d)/g, (match, div) => {
        const tierMatch = match.match(/:ow_[A-Za-z]*_([a-z]+):/i);
        if (tierMatch) {
            const tier = emojiToTier(tierMatch[1]);
            if (tier) return `${tier}${div}`;
        }
        return div;
    });

    // 남은 이모지 제거
    cleanText = cleanText.replace(/:[a-zA-Z0-9_]+:/g, ' ').replace(/\s+/g, ' ').trim();

    return { cleanText, emojiRoles };
};

/**
 * @description 한 줄 입력을 정규화→역할/티어 파싱→Player 생성 흐름으로 처리한다.
 * @param line - 파싱할 한 줄의 텍스트
 * @returns Player 객체 또는 파싱 실패 시 null
 */
export const parseLineToPlayer = (line: string): Player | null => {
    // 끝에 있는 "X" 또는 "O" 표시 확인 (마이크 사용 여부)
    const trimmedLine = line.trim();
    const noMicMatch = trimmedLine.match(/\s+([XO])$/i);
    const noMic = noMicMatch ? noMicMatch[1].toUpperCase() === 'X' : false;
    const cleanLine = trimmedLine.replace(/\s+[XO]$/i, '').trim();

    // 닉네임#태그 추출 (공백 허용)
    const nameMatch = cleanLine.match(/([^\s]+\s*#\s*\d+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1].replace(/\s+/g, '');
    let remainText = cleanLine.slice(cleanLine.indexOf(nameMatch[1]) + nameMatch[1].length).trim();

    // 이모지 정보 추출 및 제거
    const { cleanText, emojiRoles } = extractEmojiInfo(remainText);
    remainText = cleanText;

    // 역할별 랭크 초기화
    let tank = createUnrankedRank();
    let dps = createUnrankedRank();
    let sup = createUnrankedRank();

    // 슬래시로 구분된 형식 처리: "다5/다1/다5" 또는 "탱! 실3/ 딜 브1/ 힐(예상)실2"
    const slashParts = remainText.split('/').map(p => p.trim()).filter(p => p.length > 0);

    if (slashParts.length >= 2) {
        // 슬래시 구분 형식
        let roleIndex = 0; // 0: TANK, 1: DPS, 2: SUPPORT

        for (let i = 0; i < slashParts.length; i++) {
            let part = slashParts[i];

            // 역할이 명시되어 있는지 확인 (예: "탱 실3", "딜 브1", "힐 골3", "탱! 실3")
            const roleMatch = part.match(/^!?(탱(?:커)?|딜(?:러)?|힐(?:러)?|t|d|s)!?\s*/i);
            let currentRole: 'TANK' | 'DPS' | 'SUPPORT' | null = null;
            let rankPart = part;
            let isRolePreferred = part.includes('!') && roleMatch !== null;

            if (roleMatch) {
                currentRole = parseRole(roleMatch[1]);
                rankPart = part.slice(roleMatch[0].length).trim();
            }

            // 이모지 역할이 있으면 사용
            if (!currentRole && emojiRoles[i]) {
                currentRole = emojiRoles[i];
            }

            // "(배치 중)", "(배치중)", "(예상)" 제거
            rankPart = rankPart.replace(/\(배치\s*중\)/g, '').replace(/\(예상\)/g, '').trim();

            // "!" 처리 - 역할 매칭 없어도 ! 있으면 선호
            if (!isRolePreferred && part.includes('!')) isRolePreferred = true;

            // 랭크 파싱
            const parsed = parseRankSegment(rankPart);

            if (parsed) {
                // 역할에 !가 붙었으면 선호로 처리
                const rank = createRank(parsed.tierIdx, parsed.div, parsed.isPreferred || isRolePreferred);

                if (currentRole === 'TANK') {
                    tank = rank;
                } else if (currentRole === 'DPS') {
                    dps = rank;
                } else if (currentRole === 'SUPPORT') {
                    sup = rank;
                } else {
                    // 역할 명시 없으면 순서대로 할당
                    if (roleIndex === 0) tank = rank;
                    else if (roleIndex === 1) dps = rank;
                    else if (roleIndex === 2) sup = rank;
                }
            }

            // 역할이 명시되지 않은 경우에만 인덱스 증가
            if (!currentRole) {
                roleIndex++;
            }
        }
    } else {
        // 공백 또는 다른 구분자로 분리된 형식
        // "탱커 다이아3 딜러 플레4 힐러 마스터5"
        // "그5! 마1! 마4"
        const normalizedText = remainText.replace(/[,]/g, ' ');

        // 역할-랭크 쌍 추출
        const roleRankPattern = /(탱(?:커)?|딜(?:러)?|힐(?:러)?|t|d|s)?\s*!?\s*([가-힣a-zA-Z]+)\s*(\d)?\s*(!)?/gi;
        const matches = [...normalizedText.matchAll(roleRankPattern)];

        let autoIndex = 0;

        for (const m of matches) {
            const roleStr = m[1];
            const tierStr = m[2];
            const divStr = m[3];
            const exclamation = m[4];

            // "미배치" 처리
            if (tierStr.match(/미배치|unranked|배치/i)) {
                if (!roleStr) autoIndex++;
                continue;
            }

            // "예상" 같은 키워드 무시
            if (tierStr.match(/예상/)) continue;

            const tierIdx = findTierIndex(tierStr);
            if (tierIdx === -1) continue;

            const div = divStr ? parseInt(divStr) : 3;

            // ! 표시는 역할 앞이나 뒤에 올 수 있음
            const isPreferred = !!exclamation || remainText.includes(`${roleStr || ''}!`);
            const rank = createRank(tierIdx, div, isPreferred);

            if (roleStr) {
                const role = parseRole(roleStr);
                if (role === 'TANK') tank = rank;
                else if (role === 'DPS') dps = rank;
                else if (role === 'SUPPORT') sup = rank;
            } else {
                // 역할 명시 없으면 순서대로 할당
                if (autoIndex === 0) tank = rank;
                else if (autoIndex === 1) dps = rank;
                else if (autoIndex === 2) sup = rank;
                autoIndex++;
            }
        }
    }

    // 최소 하나의 역할에 점수가 있어야 유효한 플레이어
    if (tank.score === 0 && dps.score === 0 && sup.score === 0) {
        return null;
    }

    return {
        id: Date.now() + Math.random(),
        name,
        tank,
        dps,
        sup,
        noMic
    };
};

/**
 * @description 닉네임만 있는 줄인지 확인한다.
 * @param line - 확인할 줄
 * @returns 닉네임만 있으면 닉네임, 아니면 null
 */
const extractNameOnly = (line: string): string | null => {
    const trimmed = line.trim();
    // 닉네임#태그 패턴만 있고 티어 정보가 없는 경우
    const nameMatch = trimmed.match(/^([^\s]+#\d{4,})$/);
    if (nameMatch) return nameMatch[1];
    return null;
};

/**
 * @description 티어 정보만 있는 줄인지 확인한다.
 * @param line - 확인할 줄
 * @returns 티어 정보가 있으면 true
 */
const hasTierInfoOnly = (line: string): boolean => {
    const trimmed = line.trim();
    // 닉네임#태그가 없고, 슬래시나 이모지 역할이 있는 경우
    if (trimmed.match(/\d{4,}/)) return false; // 배틀태그 숫자가 있으면 false
    return trimmed.includes('/') || trimmed.includes(':pob_') || trimmed.includes(':poc_') || trimmed.includes(':pod_');
};

/**
 * @description 파싱 결과 타입
 */
export interface ParseResult {
    players: Player[];
    failedLines: string[];
}

/**
 * @description 채팅 로그에서 유효한 라인만 골라 Player 배열을 만든다.
 * @param text - 전체 채팅 로그 텍스트
 * @returns 파싱된 Player 배열과 실패한 줄 목록
 */
export const parseMultipleLines = (text: string): ParseResult => {
    const lines = text.split('\n');
    const players: Player[] = [];
    const failedLines: string[] = [];
    const seenNames = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 디스코드 메타데이터 라인 제외 (역할 아이콘, 시간 등)
        if (line.includes('역할 아이콘') || line.includes('—')) continue;

        // 닉네임#태그 패턴이 있는 줄 처리
        if (line.includes('#') && line.match(/\d{4,}/)) {
            // 닉네임만 있는 줄인지 확인
            const nameOnly = extractNameOnly(line);

            if (nameOnly) {
                // 다음 줄에 티어 정보가 있는지 확인
                const nextLine = lines[i + 1];
                if (nextLine && hasTierInfoOnly(nextLine)) {
                    // 닉네임 + 다음 줄 티어 정보 합쳐서 파싱
                    const combinedLine = `${nameOnly} ${nextLine}`;
                    const player = parseLineToPlayer(combinedLine);
                    if (player && !seenNames.has(player.name)) {
                        players.push(player);
                        seenNames.add(player.name);
                    } else if (!seenNames.has(nameOnly)) {
                        // 파싱 실패 - 닉네임만 추출해서 실패 목록에 추가
                        failedLines.push(nameOnly);
                        seenNames.add(nameOnly);
                    }
                    i++; // 다음 줄 스킵
                    continue;
                } else if (!seenNames.has(nameOnly)) {
                    // 닉네임만 있고 다음 줄에 티어 정보 없음
                    failedLines.push(nameOnly);
                    seenNames.add(nameOnly);
                    continue;
                }
            }

            // 일반적인 한 줄 파싱
            const player = parseLineToPlayer(line);
            if (player && !seenNames.has(player.name)) {
                players.push(player);
                seenNames.add(player.name);
            } else {
                // 파싱 실패 - 닉네임 추출 시도
                const nameMatch = line.match(/([^\s]+#\d{4,})/);
                if (nameMatch && !seenNames.has(nameMatch[1])) {
                    failedLines.push(nameMatch[1]);
                    seenNames.add(nameMatch[1]);
                }
            }
        }
    }

    return { players, failedLines };
};
