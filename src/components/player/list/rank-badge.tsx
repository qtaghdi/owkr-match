import React from 'react';
import { Player } from '../../../types';

interface RankBadgeProps {
    icon: React.ReactNode;
    rank: Player['tank'];
    label: string;
}

const RankBadge = ({ icon, rank, label }: RankBadgeProps) => (
    <span className={`flex items-center gap-1 text-[11px] ${
        rank.isPreferred
            ? "text-amber-400 font-semibold"
            : "text-slate-500"
    }`}>
        {icon}
        {label}
    </span>
);

export default RankBadge;
