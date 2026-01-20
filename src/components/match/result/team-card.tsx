import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { formatRank } from '../../../constants';
import { TeamResult, Role, Player } from '../../../types';
import { DamageIcon, SupportIcon, TankIcon } from "../../roles/icon";

export interface SwapSource {
    teamIdx: number;
    role: Role;
    index: number;
}

interface TeamCardProps {
    title: string;
    teamData: TeamResult;
    teamIdx: number;
    color: 'blue' | 'red';
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
}

interface PlayerTooltipProps {
    player: Player;
    visible: boolean;
}

const PlayerTooltip = ({ player, visible }: PlayerTooltipProps) => {
    if (!visible) return null;

    return (
        <div className="absolute left-0 top-full mt-2 z-50 bg-surface-elevated border border-slate-700 rounded-lg p-3 shadow-xl min-w-[180px] animate-fade-in">
            <div className="text-xs font-semibold text-slate-200 mb-2 pb-2 border-b border-slate-700">
                {player.name}
            </div>
            <div className="space-y-1.5">
                <TooltipRow
                    icon={<TankIcon size={14} />}
                    label="탱커"
                    rank={player.tank}
                />
                <TooltipRow
                    icon={<DamageIcon size={14} />}
                    label="딜러"
                    rank={player.dps}
                />
                <TooltipRow
                    icon={<SupportIcon size={14} />}
                    label="힐러"
                    rank={player.sup}
                />
            </div>
        </div>
    );
};

interface TooltipRowProps {
    icon: React.ReactNode;
    label: string;
    rank: Player['tank'];
}

const TooltipRow = ({ icon, label, rank }: TooltipRowProps) => (
    <div className={`flex items-center justify-between text-xs ${rank.isPreferred ? 'text-amber-400' : 'text-slate-400'}`}>
        <div className="flex items-center gap-1.5">
            {icon}
            <span>{label}</span>
            {rank.isPreferred && <Star size={10} className="fill-amber-400" />}
        </div>
        <span className={`font-mono ${rank.isPreferred ? 'font-semibold' : ''}`}>
            {formatRank(rank).replace('★', '')}
        </span>
    </div>
);

const TeamCard = ({ title, teamData, teamIdx, color, onSlotClick, swapSource }: TeamCardProps) => {
    const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

    const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-red-500/30';
    const titleColor = color === 'blue' ? 'text-blue-400' : 'text-red-400';

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'TANK': return <TankIcon className="text-slate-400" size={18} />;
            case 'DPS': return <DamageIcon className="text-slate-400" size={18} />;
            case 'SUPPORT': return <SupportIcon className="text-slate-400" size={18} />;
        }
    };

    const getTierImage = (tier: string): string | undefined => {
        if (!tier) return undefined;
        if (tier === 'UNRANKED') return '/tier/unrank.png';
        return `/tier/${tier.toLowerCase()}.png`;
    };

    const roles: Role[] = ['TANK', 'DPS', 'DPS', 'SUPPORT', 'SUPPORT'];

    return (
        <div className={`bg-surface-elevated border ${borderColor} rounded-xl overflow-hidden shadow-xl`}>
            <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className={`font-bold text-lg ${titleColor}`}>{title}</h3>
                <span className="text-slate-500 font-bold">{teamData.realScore.toLocaleString()}</span>
            </div>
            <div className="p-2">
                <table className="w-full text-sm border-collapse">
                    <thead>
                    <tr className="text-slate-500 text-xs text-left">
                        <th className="p-2 font-medium w-12 text-center">Role</th>
                        <th className="p-2 font-medium">Player</th>
                        <th className="p-2 font-medium text-right">Tier</th>
                    </tr>
                    </thead>
                    <tbody>
                    {roles.map((roleKey, idx) => {
                        let arrayIndex = 0;
                        if (roleKey === 'DPS' && idx === 2) arrayIndex = 1;
                        if (roleKey === 'SUPPORT' && idx === 4) arrayIndex = 1;

                        const player = teamData.assignment[roleKey][arrayIndex];
                        if (!player) return null;

                        const playerId = `${teamIdx}-${roleKey}-${arrayIndex}`;
                        const isSelected = swapSource?.teamIdx === teamIdx && swapSource?.role === roleKey && swapSource?.index === arrayIndex;
                        const rankInfo = roleKey === 'TANK' ? player.tank : roleKey === 'DPS' ? player.dps : player.sup;
                        const tierImg = getTierImage(rankInfo.tier);
                        const isHovered = hoveredPlayer === playerId;

                        return (
                            <tr
                                key={playerId}
                                onClick={() => onSlotClick(teamIdx, roleKey, arrayIndex)}
                                onMouseEnter={() => setHoveredPlayer(playerId)}
                                onMouseLeave={() => setHoveredPlayer(null)}
                                className={`
                                    border-b border-slate-800/50 cursor-pointer transition-colors
                                    ${isSelected ? 'bg-blue-900/30 ring-1 ring-blue-500 inset-0' : 'hover:bg-slate-800'}
                                `}
                            >
                                <td className="py-2 px-3 align-middle w-12 text-center">
                                    <div className="flex items-center justify-center">
                                        {getRoleIcon(roleKey)}
                                    </div>
                                </td>

                                <td className="py-2 px-3 align-middle font-medium relative">
                                    <div className="flex items-center gap-1 text-slate-200">
                                        {player.name}
                                        {rankInfo.isPreferred && <Star size={12} className="text-yellow-400 fill-yellow-400"/>}
                                    </div>
                                    <PlayerTooltip player={player} visible={isHovered} />
                                </td>

                                <td className="py-2 px-3 align-middle text-right font-mono text-slate-300">
                                    <div className="flex items-center justify-end gap-2">
                                        {tierImg && (
                                            <img
                                                src={tierImg}
                                                alt={rankInfo.tier}
                                                className="w-6 h-6 object-contain"
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                        )}
                                        <span>
                                            {formatRank(rankInfo).replace('★','')}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeamCard;
