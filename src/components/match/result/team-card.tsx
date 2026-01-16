import React from 'react';
import { Star } from 'lucide-react';
import { formatRank } from '../../../constants';
import { TeamResult, Role } from '../../../types';
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

const TeamCard = ({ title, teamData, teamIdx, color, onSlotClick, swapSource }: TeamCardProps) => {

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
        <div className={`bg-[#151821] border ${borderColor} rounded-xl overflow-hidden shadow-xl`}>
            <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className={`font-bold text-lg ${titleColor}`}>{title}</h3>
                <span className="text-slate-500 font-bold">{teamData.realScore.toLocaleString()}</span>
            </div>
            <div className="p-2">
                <table className="w-full text-sm border-collapse"> {/* border-collapse 추가 */}
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

                        const isSelected = swapSource?.teamIdx === teamIdx && swapSource?.role === roleKey && swapSource?.index === arrayIndex;
                        const rankInfo = roleKey === 'TANK' ? player.tank : roleKey === 'DPS' ? player.dps : player.sup;
                        const tierImg = getTierImage(rankInfo.tier);

                        return (
                            <tr
                                key={`${roleKey}-${arrayIndex}`}
                                onClick={() => onSlotClick(teamIdx, roleKey, arrayIndex)}
                                className={`
                                    border-b border-slate-800/50 cursor-pointer transition-colors
                                    ${isSelected ? 'bg-blue-900/30 ring-1 ring-blue-500 inset-0' : 'hover:bg-slate-800'}
                                `}
                            >
                                {/* [Role] td 자체는 table-cell 유지(flex 제거), 내용은 div로 감싸서 정렬 */}
                                <td className="py-2 px-3 align-middle w-12 text-center">
                                    <div className="flex items-center justify-center">
                                        {getRoleIcon(roleKey)}
                                    </div>
                                </td>

                                {/* [Player] align-middle로 수직 중앙 강제 */}
                                <td className="py-2 px-3 align-middle font-medium">
                                    <div className="flex items-center gap-1 text-slate-200">
                                        {player.name}
                                        {rankInfo.isPreferred && <Star size={12} className="text-yellow-400 fill-yellow-400"/>}
                                    </div>
                                </td>

                                {/* [Tier] align-middle 사용 */}
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