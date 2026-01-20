/**
 * 오버워치 역할 타입
 * - TANK: 탱커 (1명)
 * - DPS: 딜러 (2명)
 * - SUPPORT: 힐러 (2명)
 */
export type Role = 'TANK' | 'DPS' | 'SUPPORT';

/**
 * 티어 타입 (브론즈 ~ 챔피언 + 미배치)
 */
export type Tier =
    | 'BRONZE'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | 'DIAMOND'
    | 'MASTER'
    | 'GRANDMASTER'
    | 'CHAMPION'
    | 'UNRANKED';

/**
 * 플레이어의 특정 역할에 대한 랭크 정보
 *
 * @property tier - 티어 (BRONZE ~ CHAMPION, UNRANKED)
 * @property div - 등급 (1~5, 미배치는 0)
 * @property score - 계산된 점수 (티어 * 600 + (6 - div) * 100)
 * @property isPreferred - 선호 역할 여부 (! 표시)
 */
export interface Rank {
    tier: Tier | string;
    div: number | string;
    score: number;
    isPreferred: boolean;
}

/**
 * 플레이어 정보
 *
 * @property id - 고유 식별자 (타임스탬프 + 랜덤)
 * @property name - 배틀태그 (닉네임#숫자)
 * @property tank - 탱커 역할 랭크
 * @property dps - 딜러 역할 랭크
 * @property sup - 힐러 역할 랭크
 */
export interface Player {
    id: number;
    name: string;
    tank: Rank;
    dps: Rank;
    sup: Rank;
}

/**
 * 팀 내 역할별 플레이어 배치
 *
 * @property TANK - 탱커 배치 (1명)
 * @property DPS - 딜러 배치 (2명)
 * @property SUPPORT - 힐러 배치 (2명)
 */
export interface RoleAssignment {
    TANK: Player[];
    DPS: Player[];
    SUPPORT: Player[];
}

/**
 * 단일 팀의 매칭 결과
 *
 * @property name - 팀 이름 (TEAM 1, TEAM 2)
 * @property assignment - 역할별 플레이어 배치
 * @property algoScore - 알고리즘 점수 (선호도 보너스/페널티 포함)
 * @property realScore - 실제 점수 (순수 티어 기반)
 */
export interface TeamResult {
    name: string;
    assignment: RoleAssignment;
    algoScore: number;
    realScore: number;
}

/**
 * 전체 매칭 결과
 *
 * @property teamA - 1팀 결과
 * @property teamB - 2팀 결과
 * @property diff - 실제 점수 차이
 */
export interface MatchResultData {
    teamA: TeamResult;
    teamB: TeamResult;
    diff: number;
}
