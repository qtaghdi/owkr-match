export type Role = 'TANK' | 'DPS' | 'SUPPORT';

export interface Rank {
    tier: string;
    div: number | string;
    score: number;
    isPreferred: boolean;
}

export interface Player {
    id: number;
    name: string;
    tank: Rank;
    dps: Rank;
    sup: Rank;
}

export interface RoleAssignment {
    TANK: Player[];
    DPS: Player[];
    SUPPORT: Player[];
}

export interface TeamResult {
    name: string;
    assignment: RoleAssignment;
    algoScore: number;
    realScore: number;
}

export interface MatchResultData {
    teamA: TeamResult;
    teamB: TeamResult;
    diff: number;
}