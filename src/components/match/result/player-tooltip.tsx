import React from 'react';
import { Star } from 'lucide-react';
import { formatRank } from '../../../constants';
import { Player } from '../../../types';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';

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

interface PlayerTooltipProps {
    player: Player;
    visible: boolean;
    showAbove?: boolean;
    alignRight?: boolean;
}

const PlayerTooltip = ({ player, visible, showAbove = false, alignRight = false }: PlayerTooltipProps) => {
    if (!visible) return null;

    const positionClass = showAbove
        ? 'bottom-full mb-2'
        : 'top-full mt-2';

    const alignClass = alignRight ? 'right-0' : 'left-0';

    return (
        <div className={`absolute ${alignClass} ${positionClass} z-50 bg-surface-elevated border border-slate-700 rounded-lg p-3 shadow-xl min-w-[180px] animate-fade-in`}>
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

export default PlayerTooltip;
