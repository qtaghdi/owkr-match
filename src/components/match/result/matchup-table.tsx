import { useState } from 'react';
import { Ban, MicOff, Star } from 'lucide-react';
import { formatRank } from '../../../constants';
import type { MatchResultData, Player, Rank, Role, SwapSource } from '../../../types';
import { getTierImage } from '../../../utils/tier';
import { BattleTagCopyButton } from '../../player/battle-tag-copy-button';
import { PlayerIdentity } from '../../player/player-identity';
import RankBadge from '../../player/rank-badge';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';
import type { MatchupDisplayMode } from './display-mode';
import PlayerTooltip from './player-tooltip';

interface MatchupTableProps {
    matchResult: MatchResultData;
    onSlotClick?: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
    displayMode?: MatchupDisplayMode;
    interactive?: boolean;
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

interface PlayerSlotContentProps {
    player: Player;
    assignedRole: Role;
    side: 'left' | 'right';
    displayMode: MatchupDisplayMode;
    interactive: boolean;
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

const PlayerMicIndicator = ({ noMic }: { noMic?: boolean }) => noMic ? (
    <span className="inline-flex shrink-0 text-red-400" aria-label="마이크 미사용" title="마이크 미사용">
        <MicOff size={12} aria-hidden="true" />
    </span>
) : null;

const getRoleIcon = (role: Role) => {
    switch (role) {
        case 'TANK':
            return <TankIcon className="text-slate-400" size={18} aria-hidden="true" />;
        case 'DPS':
            return <DamageIcon className="text-slate-400" size={18} aria-hidden="true" />;
        case 'SUPPORT':
            return <SupportIcon className="text-slate-400" size={18} aria-hidden="true" />;
    }
};

const getRankInfo = (player: Player, role: Role): Rank =>
    role === 'TANK' ? player.tank : role === 'DPS' ? player.dps : player.sup;

const CompactRank = ({ rank, side }: { rank: Rank; side: 'left' | 'right' }) => {
    const tierImage = getTierImage(rank.tier);
    const rankLabel = formatRank(rank).replace('★', '').replace('?', '');

    return (
        <div className="flex shrink-0 items-center gap-1.5">
            {side === 'right' && (
                <span className="w-10 text-right font-mono text-sm text-slate-200">{rankLabel}</span>
            )}
            {tierImage && (
                <img
                    src={tierImage}
                    alt={rank.tier}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain"
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            )}
            {side === 'left' && (
                <span className="w-10 text-left font-mono text-sm text-slate-200">{rankLabel}</span>
            )}
        </div>
    );
};

const AllRankBadges = ({ player, assignedRole }: { player: Player; assignedRole: Role }) => (
    <div className="flex max-w-full shrink-0 flex-wrap items-center gap-x-2 gap-y-1" aria-label="전체 역할 티어">
        <RankBadge role="TANK" rank={player.tank} isAssigned={assignedRole === 'TANK'} />
        <RankBadge role="DPS" rank={player.dps} isAssigned={assignedRole === 'DPS'} />
        <RankBadge role="SUPPORT" rank={player.sup} isAssigned={assignedRole === 'SUPPORT'} />
    </div>
);

/**
 * @description compact 모드와 전체 티어 모드에서 플레이어 슬롯 내부 표시만 전환한다.
 */
const PlayerSlotContent = ({
    player,
    assignedRole,
    side,
    displayMode,
    interactive,
}: PlayerSlotContentProps) => {
    const assignedRank = getRankInfo(player, assignedRole);
    const copyButton = interactive ? (
        <BattleTagCopyButton battleTag={player.name} className="pointer-events-auto" />
    ) : null;

    if (displayMode === 'compact') {
        return (
            <div className={`pointer-events-none relative z-10 flex w-full min-w-0 items-center gap-2 px-4 py-3 ${
                side === 'left' ? 'justify-end text-right' : 'text-left'
            }`}>
                {side === 'left' ? (
                    <>
                        <PlayerIdentity player={player} align="right" />
                        {copyButton}
                        <CompactRank rank={assignedRank} side="left" />
                    </>
                ) : (
                    <>
                        <CompactRank rank={assignedRank} side="right" />
                        <PlayerIdentity player={player} />
                        {copyButton}
                    </>
                )}
                <PlayerStatusIndicators
                    isPreferred={assignedRank.isPreferred}
                    isAvoided={assignedRank.isAvoided}
                    noMic={player.noMic}
                    className={side === 'right' ? 'ml-auto' : ''}
                />
            </div>
        );
    }

    const identity = (
        <span className="min-w-[5rem] max-w-full flex-1">
            <PlayerIdentity player={player} align={side === 'left' ? 'right' : 'left'} layout="inline" />
        </span>
    );
    const ranks = <AllRankBadges player={player} assignedRole={assignedRole} />;
    const mic = <PlayerMicIndicator noMic={player.noMic} />;

    return (
        <div className={`pointer-events-none relative z-10 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2.5 sm:px-3 ${
            side === 'left' ? 'justify-end text-right' : 'text-left'
        }`}>
            {side === 'left' ? (
                <>
                    {identity}
                    {copyButton}
                    {ranks}
                    {mic}
                </>
            ) : (
                <>
                    {ranks}
                    {identity}
                    {copyButton}
                    {mic}
                </>
            )}
        </div>
    );
};

/**
 * @description 두 팀의 역할별 맞대결을 compact 또는 전체 티어 모드로 보여준다.
 */
const MatchupTable = ({
    matchResult,
    onSlotClick,
    swapSource,
    displayMode = 'compact',
    interactive = true,
}: MatchupTableProps) => {
    const { teamA, teamB } = matchResult;
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

    const rows: RowDef[] = [
        { role: 'TANK', arrayIndex: 0, playerA: teamA.assignment.TANK[0], playerB: teamB.assignment.TANK[0] },
        { role: 'DPS', arrayIndex: 0, playerA: teamA.assignment.DPS[0], playerB: teamB.assignment.DPS[0] },
        { role: 'DPS', arrayIndex: 1, playerA: teamA.assignment.DPS[1], playerB: teamB.assignment.DPS[1] },
        { role: 'SUPPORT', arrayIndex: 0, playerA: teamA.assignment.SUPPORT[0], playerB: teamB.assignment.SUPPORT[0] },
        { role: 'SUPPORT', arrayIndex: 1, playerA: teamA.assignment.SUPPORT[1], playerB: teamB.assignment.SUPPORT[1] },
    ];

    const isSelected = (teamIdx: number, role: Role, idx: number) =>
        interactive
        && swapSource?.teamIdx === teamIdx
        && swapSource.role === role
        && swapSource.index === idx;

    return (
        <div className="space-y-1.5" data-display-mode={displayMode}>
            <div className="mb-4 flex items-center px-1">
                <div className="flex flex-1 items-center gap-2">
                    <span className="text-lg font-bold text-blue-400">1팀</span>
                    <span className="rounded bg-orange-500/20 px-2 py-1 text-xs font-semibold text-orange-300">선공격</span>
                </div>
                <div className="w-10" />
                <div className="flex flex-1 flex-row-reverse items-center gap-2">
                    <span className="text-lg font-bold text-red-400">2팀</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">선수비</span>
                </div>
            </div>

            {rows.map((row) => {
                const selA = isSelected(0, row.role, row.arrayIndex);
                const selB = isSelected(1, row.role, row.arrayIndex);
                const slotKeyA = `A-${row.role}-${row.arrayIndex}`;
                const slotKeyB = `B-${row.role}-${row.arrayIndex}`;

                return (
                    <div
                        key={`${row.role}-${row.arrayIndex}`}
                        className="flex items-stretch gap-1.5 rounded-lg border border-slate-700/70 bg-slate-950/20"
                    >
                        <div
                            className="relative flex min-w-0 flex-1"
                            onMouseEnter={interactive ? () => setHoveredSlot(slotKeyA) : undefined}
                            onMouseLeave={interactive ? () => setHoveredSlot(null) : undefined}
                            onFocus={interactive ? () => setHoveredSlot(slotKeyA) : undefined}
                            onBlur={interactive ? () => setHoveredSlot(null) : undefined}
                        >
                            <div className={`relative flex w-full min-w-0 items-center justify-end rounded-l-lg transition-colors ${
                                selA
                                    ? 'bg-blue-900/40 ring-1 ring-inset ring-blue-500'
                                    : interactive ? 'hover:bg-slate-800/70' : ''
                            }`}>
                                {interactive && (
                                    <button
                                        type="button"
                                        data-exclude-export
                                        data-html2canvas-ignore="true"
                                        onClick={() => onSlotClick?.(0, row.role, row.arrayIndex)}
                                        aria-label={`${row.playerA.discordName ?? row.playerA.name} 교체 슬롯 선택`}
                                        className="absolute inset-0 z-0 rounded-l-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                    />
                                )}
                                <PlayerSlotContent
                                    player={row.playerA}
                                    assignedRole={row.role}
                                    side="left"
                                    displayMode={displayMode}
                                    interactive={interactive}
                                />
                            </div>
                            {interactive && (
                                <PlayerTooltip player={row.playerA} visible={hoveredSlot === slotKeyA} />
                            )}
                        </div>

                        <div className="flex w-10 shrink-0 items-center justify-center">
                            {getRoleIcon(row.role)}
                        </div>

                        <div
                            className="relative flex min-w-0 flex-1"
                            onMouseEnter={interactive ? () => setHoveredSlot(slotKeyB) : undefined}
                            onMouseLeave={interactive ? () => setHoveredSlot(null) : undefined}
                            onFocus={interactive ? () => setHoveredSlot(slotKeyB) : undefined}
                            onBlur={interactive ? () => setHoveredSlot(null) : undefined}
                        >
                            <div className={`relative flex w-full min-w-0 items-center rounded-r-lg transition-colors ${
                                selB
                                    ? 'bg-red-900/30 ring-1 ring-inset ring-red-500'
                                    : interactive ? 'hover:bg-slate-800/70' : ''
                            }`}>
                                {interactive && (
                                    <button
                                        type="button"
                                        data-exclude-export
                                        data-html2canvas-ignore="true"
                                        onClick={() => onSlotClick?.(1, row.role, row.arrayIndex)}
                                        aria-label={`${row.playerB.discordName ?? row.playerB.name} 교체 슬롯 선택`}
                                        className="absolute inset-0 z-0 rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                    />
                                )}
                                <PlayerSlotContent
                                    player={row.playerB}
                                    assignedRole={row.role}
                                    side="right"
                                    displayMode={displayMode}
                                    interactive={interactive}
                                />
                            </div>
                            {interactive && (
                                <PlayerTooltip player={row.playerB} visible={hoveredSlot === slotKeyB} alignRight />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchupTable;
