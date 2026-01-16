import React from 'react';
import { Star } from 'lucide-react';
import { formatRank } from '../../../constants';
import { MatchResultData, TeamResult, Role } from '../../../types';
import { DamageIcon, SupportIcon, TankIcon } from "../../roles/icon";

interface SwapSource {
    teamIdx: number;
    role: Role;
    index: number;
}

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
}

const TeamCard = ({ title, teamData, teamIdx, color, onSlotClick, swapSource }:
                  { title: string, teamData: TeamResult, teamIdx: number, color: 'blue'|'red', onSlotClick: any, swapSource: any }) => {

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
            </div>
            <div className="p-2">
                <table className="w-full text-sm">
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
                                <td className="p-3 flex justify-center items-center">
                                    {getRoleIcon(roleKey)}
                                </td>
                                <td className="p-3 font-medium">
                                    <div className="flex items-center gap-1 text-slate-200">
                                        {player.name}
                                        {rankInfo.isPreferred && <Star size={12} className="text-yellow-400 fill-yellow-400"/>}
                                    </div>
                                </td>
                                <td className="p-3 text-right font-mono text-slate-300">
                                    {/* 티어 아이콘과 텍스트를 나란히 배치 */}
                                    <div className="flex items-center justify-end gap-2">
                                        {/* [수정] tierImg가 있을 때만 렌더링 (TS 에러 방지) */}
                                        {tierImg && (
                                            <img
                                                src={tierImg}
                                                alt={rankInfo.tier}
                                                className="w-6 h-6 object-contain"
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                        )}
                                        <span>{formatRank(rankInfo).replace('★','')}</span>
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

const MatchResult: React.FC<MatchResultProps> = ({ matchResult, onSlotClick, swapSource }) => {
    return (
        <div className="grid md:grid-cols-2 gap-6 relative">
            <TeamCard title="TEAM 1" teamData={matchResult.teamA} teamIdx={0} color="blue" onSlotClick={onSlotClick} swapSource={swapSource} />
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b0c10] border border-slate-700 rounded-full items-center justify-center z-10 font-bold text-xs text-slate-500">VS</div>
            <TeamCard title="TEAM 2" teamData={matchResult.teamB} teamIdx={1} color="red" onSlotClick={onSlotClick} swapSource={swapSource} />
            <div className="md:col-span-2 text-center text-slate-500 text-xs mt-2">* 플레이어를 클릭하여 스왑 (점수차: {matchResult.diff.toLocaleString()})</div>
        </div>
    );
};

export default MatchResult;