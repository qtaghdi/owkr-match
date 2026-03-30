import React from 'react';
import { Star, MicOff } from 'lucide-react';
import { formatRank } from '../../../constants';
import { MatchResultData, Role, Player } from '../../../types';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';
import { getTierImage } from '../../../utils/tier';
import { SwapSource } from './team-card';
import PlayerTooltip from './player-tooltip';

interface MatchupTableProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
}

interface RowDef {
    role: Role;
    arrayIndex: number;
    playerA: Player;
    playerB: Player;
}

const getRoleIcon = (role: Role) => {
    switch (role) {
        case 'TANK': return <TankIcon className="text-slate-500" size={16} />;
        case 'DPS': return <DamageIcon className="text-slate-500" size={16} />;
        case 'SUPPORT': return <SupportIcon className="text-slate-500" size={16} />;
    }
};

const getRankInfo = (player: Player, role: Role) =>
    role === 'TANK' ? player.tank : role === 'DPS' ? player.dps : player.sup;

/**
 * @description 두 팀의 역할별 맞대결을 한 줄씩 보여주는 테이블 컴포넌트.
 */
const MatchupTable = ({ matchResult, onSlotClick, swapSource }: MatchupTableProps) => {
    const { teamA, teamB } = matchResult;

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
        <div className="space-y-1">
            {/* 팀 헤더 */}
            <div className="flex items-center mb-3">
                <div className="flex-1 flex items-center gap-2">
                    <span className="font-bold text-base text-blue-400">TEAM 1</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-500/20 text-orange-400">선공격</span>
                    <span className="text-xs text-slate-500 ml-auto">{teamA.realScore.toLocaleString()}</span>
                </div>
                <div className="w-8" />
                <div className="flex-1 flex items-center gap-2 flex-row-reverse">
                    <span className="font-bold text-base text-red-400">TEAM 2</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-400">선수비</span>
                    <span className="text-xs text-slate-500 mr-auto">{teamB.realScore.toLocaleString()}</span>
                </div>
            </div>

            {/* 맞대결 행 */}
            {rows.map((row, rowIdx) => {
                const rankA = getRankInfo(row.playerA, row.role);
                const rankB = getRankInfo(row.playerB, row.role);
                const tierImgA = getTierImage(rankA.tier);
                const tierImgB = getTierImage(rankB.tier);
                const selA = isSelected(0, row.role, row.arrayIndex);
                const selB = isSelected(1, row.role, row.arrayIndex);

                return (
                    <div
                        key={`${row.role}-${row.arrayIndex}`}
                        className="flex items-center gap-1 rounded-lg border border-slate-800/60"
                    >
                        {/* TEAM 1 슬롯 */}
                        <button
                            onClick={() => onSlotClick(0, row.role, row.arrayIndex)}
                            className={`flex-1 flex items-center justify-end gap-1.5 px-3 py-2.5 rounded-l-lg transition-colors text-right min-w-0 ${
                                selA ? 'bg-blue-900/40 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-800/70'
                            }`}
                        >
                            <span className="text-xs font-medium text-slate-200 truncate">{row.playerA.name}</span>
                            {rankA.isPreferred && <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                            {row.playerA.noMic && <MicOff size={10} className="text-red-400 shrink-0" />}
                            <div className="flex items-center gap-1 shrink-0">
                                {tierImgA && (
                                    <img src={tierImgA} alt={rankA.tier} className="w-5 h-5 object-contain"
                                        onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                                <span className="text-xs font-mono text-slate-300 w-8 text-left">
                                    {formatRank(rankA).replace('★', '')}
                                </span>
                            </div>
                        </button>

                        {/* 역할 아이콘 (중앙) */}
                        <div className="shrink-0 w-8 flex items-center justify-center">
                            {getRoleIcon(row.role)}
                        </div>

                        {/* TEAM 2 슬롯 */}
                        <button
                            onClick={() => onSlotClick(1, row.role, row.arrayIndex)}
                            className={`flex-1 flex items-center gap-1.5 px-3 py-2.5 rounded-r-lg transition-colors text-left min-w-0 ${
                                selB ? 'bg-red-900/30 ring-1 ring-inset ring-red-500' : 'hover:bg-slate-800/70'
                            }`}
                        >
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs font-mono text-slate-300 w-8 text-right">
                                    {formatRank(rankB).replace('★', '')}
                                </span>
                                {tierImgB && (
                                    <img src={tierImgB} alt={rankB.tier} className="w-5 h-5 object-contain"
                                        onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                            </div>
                            {row.playerB.noMic && <MicOff size={10} className="text-red-400 shrink-0" />}
                            {rankB.isPreferred && <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                            <span className="text-xs font-medium text-slate-200 truncate">{row.playerB.name}</span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchupTable;
