import { useState } from 'react';
import { Ban, Star, MicOff } from 'lucide-react';
import { formatRank } from '../../../constants';
import type { MatchResultData, Player, Role, SwapSource } from '../../../types';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';
import { getTierImage } from '../../../utils/tier';
import PlayerTooltip from './player-tooltip';
import { PlayerIdentity } from '../../player/player-identity';
import { BattleTagCopyButton } from '../../player/battle-tag-copy-button';

interface MatchupTableProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
    showAllRanks?: boolean;
}

interface RowDef {
    role: Role;
    arrayIndex: number;
    playerA: Player;
    playerB: Player;
}

interface PlayerStatusIndicatorsProps {
    isPreferred: boolean;
    isAvoided: boolean;
    noMic?: boolean;
    className?: string;
}

const PlayerStatusIndicators = ({
    isPreferred,
    isAvoided,
    noMic,
    className = '',
}: PlayerStatusIndicatorsProps) => (
    <div className={`flex w-10 shrink-0 items-center justify-end gap-1 ${className}`}>
        {isPreferred && (
            <span className="inline-flex text-yellow-400" aria-label="선호 역할" title="선호 역할">
                <Star size={12} className="fill-current" aria-hidden="true" />
            </span>
        )}
        {isAvoided && (
            <span className="inline-flex text-rose-400" aria-label="비선호 역할" title="비선호 역할">
                <Ban size={12} aria-hidden="true" />
            </span>
        )}
        {noMic && (
            <span className="inline-flex text-red-400" aria-label="마이크 미사용" title="마이크 미사용">
                <MicOff size={12} aria-hidden="true" />
            </span>
        )}
    </div>
);

const getRoleIcon = (role: Role) => {
    switch (role) {
        case 'TANK': return <TankIcon className="text-slate-400" size={18} />;
        case 'DPS': return <DamageIcon className="text-slate-400" size={18} />;
        case 'SUPPORT': return <SupportIcon className="text-slate-400" size={18} />;
    }
};

const getRankInfo = (player: Player, role: Role) =>
    role === 'TANK' ? player.tank : role === 'DPS' ? player.dps : player.sup;

const roleRankDefs = [
    { role: 'TANK', label: '탱커' },
    { role: 'DPS', label: '딜러' },
    { role: 'SUPPORT', label: '힐러' },
] as const;

interface PlayerRankSummaryProps {
    player: Player;
    assignedRole: Role;
    align: 'left' | 'right';
}

const getCompactRoleIcon = (role: Role) => {
    switch (role) {
        case 'TANK': return <TankIcon size={12} aria-hidden="true" />;
        case 'DPS': return <DamageIcon size={12} aria-hidden="true" />;
        case 'SUPPORT': return <SupportIcon size={12} aria-hidden="true" />;
    }
};

/**
 * @description 탱커, 딜러, 힐러 티어를 고정 순서로 보여주고 현재 배정 역할을 강조한다.
 */
const PlayerRankSummary = ({ player, assignedRole, align }: PlayerRankSummaryProps) => (
    <div className={`flex w-full flex-wrap items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {roleRankDefs.map(({ role, label }) => {
            const rank = getRankInfo(player, role);
            const isAssigned = role === assignedRole;
            const rankLabel = formatRank(rank);

            return (
                <span
                    key={role}
                    title={`${label} ${rankLabel}${isAssigned ? ' · 현재 배정' : ''}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[11px] leading-none ${
                        isAssigned
                            ? 'border-cyan-400/40 bg-cyan-400/10 font-semibold text-cyan-200'
                            : rank.isPreferred
                                ? 'border-transparent text-amber-400'
                                : rank.isAvoided
                                    ? 'border-transparent text-rose-400'
                                    : 'border-transparent text-slate-500'
                    }`}
                >
                    {getCompactRoleIcon(role)}
                    {rankLabel}
                </span>
            );
        })}
    </div>
);

/**
 * @description 두 팀의 역할별 맞대결을 한 줄씩 보여주는 테이블 컴포넌트.
 */
const MatchupTable = ({ matchResult, onSlotClick, swapSource, showAllRanks = false }: MatchupTableProps) => {
    const { teamA, teamB } = matchResult;
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

    const rows: RowDef[] = [
        { role: 'TANK',    arrayIndex: 0, playerA: teamA.assignment.TANK[0],    playerB: teamB.assignment.TANK[0] },
        { role: 'DPS',     arrayIndex: 0, playerA: teamA.assignment.DPS[0],     playerB: teamB.assignment.DPS[0] },
        { role: 'DPS',     arrayIndex: 1, playerA: teamA.assignment.DPS[1],     playerB: teamB.assignment.DPS[1] },
        { role: 'SUPPORT', arrayIndex: 0, playerA: teamA.assignment.SUPPORT[0], playerB: teamB.assignment.SUPPORT[0] },
        { role: 'SUPPORT', arrayIndex: 1, playerA: teamA.assignment.SUPPORT[1], playerB: teamB.assignment.SUPPORT[1] },
    ];

    const isSelected = (teamIdx: number, role: Role, idx: number) =>
        swapSource?.teamIdx === teamIdx && swapSource?.role === role && swapSource?.index === idx;

    return (
        <div className="space-y-1.5">
            {/* 팀 헤더 */}
            <div className="flex items-center mb-4 px-1">
                <div className="flex-1 flex items-center gap-2">
                    <span className="font-bold text-lg text-blue-400">1팀</span>
                    <span className="text-xs px-2 py-1 rounded font-semibold bg-orange-500/20 text-orange-300">선공격</span>
                </div>
                <div className="w-10" />
                <div className="flex-1 flex items-center gap-2 flex-row-reverse">
                    <span className="font-bold text-lg text-red-400">2팀</span>
                    <span className="text-xs px-2 py-1 rounded font-semibold bg-emerald-500/20 text-emerald-300">선수비</span>
                </div>
            </div>

            {/* 맞대결 행 */}
            {rows.map((row) => {
                const rankA = getRankInfo(row.playerA, row.role);
                const rankB = getRankInfo(row.playerB, row.role);
                const tierImgA = getTierImage(rankA.tier);
                const tierImgB = getTierImage(rankB.tier);
                const selA = isSelected(0, row.role, row.arrayIndex);
                const selB = isSelected(1, row.role, row.arrayIndex);
                const slotKeyA = `A-${row.role}-${row.arrayIndex}`;
                const slotKeyB = `B-${row.role}-${row.arrayIndex}`;

                return (
                    <div
                        key={`${row.role}-${row.arrayIndex}`}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-950/20"
                    >
                        {/* TEAM 1 슬롯 */}
                        <div
                            className="flex-1 relative min-w-0"
                            onMouseEnter={() => setHoveredSlot(slotKeyA)}
                            onMouseLeave={() => setHoveredSlot(null)}
                            onFocus={() => setHoveredSlot(slotKeyA)}
                            onBlur={() => setHoveredSlot(null)}
                        >
                            <div
                                className={`relative flex w-full min-w-0 items-center justify-end rounded-l-lg transition-colors ${
                                    selA ? 'bg-blue-900/40 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-800/70'
                                }`}
                            >
                                <button
                                    type="button"
                                    data-exclude-export
                                    data-html2canvas-ignore="true"
                                    onClick={() => onSlotClick(0, row.role, row.arrayIndex)}
                                    aria-label={`${row.playerA.discordName ?? row.playerA.name} 교체 슬롯 선택`}
                                    className="absolute inset-0 z-0 rounded-l-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                />
                                <div className={`pointer-events-none relative z-10 flex w-full min-w-0 px-4 py-3 text-right ${
                                    showAllRanks ? 'flex-col items-end gap-1.5' : 'items-center justify-end gap-2'
                                }`}>
                                    <div className="flex w-full min-w-0 items-center justify-end gap-2">
                                        <PlayerIdentity player={row.playerA} align="right" />
                                        <BattleTagCopyButton battleTag={row.playerA.name} className="pointer-events-auto" />
                                        {!showAllRanks && (
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {tierImgA && (
                                                    <img src={tierImgA} alt={rankA.tier} width={24} height={24} className="h-6 w-6 object-contain"
                                                        onError={(e) => e.currentTarget.style.display = 'none'} />
                                                )}
                                                <span className="w-10 text-left font-mono text-sm text-slate-200">
                                                    {formatRank(rankA).replace('★', '').replace('?', '')}
                                                </span>
                                            </div>
                                        )}
                                        <PlayerStatusIndicators
                                            isPreferred={rankA.isPreferred}
                                            isAvoided={rankA.isAvoided}
                                            noMic={row.playerA.noMic}
                                        />
                                    </div>
                                    {showAllRanks && (
                                        <PlayerRankSummary player={row.playerA} assignedRole={row.role} align="right" />
                                    )}
                                </div>
                            </div>
                            <PlayerTooltip player={row.playerA} visible={hoveredSlot === slotKeyA} />
                        </div>

                        {/* 역할 아이콘 (중앙) */}
                        <div className="shrink-0 w-10 flex items-center justify-center">
                            {getRoleIcon(row.role)}
                        </div>

                        {/* TEAM 2 슬롯 */}
                        <div
                            className="flex-1 relative min-w-0"
                            onMouseEnter={() => setHoveredSlot(slotKeyB)}
                            onMouseLeave={() => setHoveredSlot(null)}
                            onFocus={() => setHoveredSlot(slotKeyB)}
                            onBlur={() => setHoveredSlot(null)}
                        >
                            <div
                                className={`relative flex w-full min-w-0 items-center rounded-r-lg transition-colors ${
                                    selB ? 'bg-red-900/30 ring-1 ring-inset ring-red-500' : 'hover:bg-slate-800/70'
                                }`}
                            >
                                <button
                                    type="button"
                                    data-exclude-export
                                    data-html2canvas-ignore="true"
                                    onClick={() => onSlotClick(1, row.role, row.arrayIndex)}
                                    aria-label={`${row.playerB.discordName ?? row.playerB.name} 교체 슬롯 선택`}
                                    className="absolute inset-0 z-0 rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                />
                                <div className={`pointer-events-none relative z-10 flex w-full min-w-0 px-4 py-3 text-left ${
                                    showAllRanks ? 'flex-col items-start gap-1.5' : 'items-center gap-2'
                                }`}>
                                    <div className="flex w-full min-w-0 items-center gap-2">
                                        {!showAllRanks && (
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <span className="w-10 text-right font-mono text-sm text-slate-200">
                                                    {formatRank(rankB).replace('★', '').replace('?', '')}
                                                </span>
                                                {tierImgB && (
                                                    <img src={tierImgB} alt={rankB.tier} width={24} height={24} className="h-6 w-6 object-contain"
                                                        onError={(e) => e.currentTarget.style.display = 'none'} />
                                                )}
                                            </div>
                                        )}
                                        <PlayerIdentity player={row.playerB} />
                                        <BattleTagCopyButton battleTag={row.playerB.name} className="pointer-events-auto" />
                                        <PlayerStatusIndicators
                                            isPreferred={rankB.isPreferred}
                                            isAvoided={rankB.isAvoided}
                                            noMic={row.playerB.noMic}
                                            className="ml-auto"
                                        />
                                    </div>
                                    {showAllRanks && (
                                        <PlayerRankSummary player={row.playerB} assignedRole={row.role} align="left" />
                                    )}
                                </div>
                            </div>
                            <PlayerTooltip player={row.playerB} visible={hoveredSlot === slotKeyB} alignRight />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchupTable;
