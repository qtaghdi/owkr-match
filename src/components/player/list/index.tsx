import React from 'react';
import { Trash2, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from 'src/types';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';
import { formatRank } from "src/constants";

interface PlayerListProps {
    players: Player[];
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

const PlayerList = ({ players = [], setPlayers }: PlayerListProps) => {
    if (!players) return null;

    const playerCount = players.length;
    const isReady = playerCount === 10;
    const needMore = 10 - playerCount;

    return (
        <div className="card min-h-[300px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-slate-400" />
                        <h2 className="text-base font-semibold text-white">대기 명단</h2>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        isReady
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                        {playerCount}/10
                    </div>
                </div>

                {playerCount > 0 && (
                    <button
                        onClick={() => setPlayers([])}
                        className="btn-danger text-xs flex items-center gap-1.5"
                    >
                        <Trash2 size={12} />
                        전체 삭제
                    </button>
                )}
            </div>

            {/* Status Message */}
            {!isReady && playerCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle size={14} className="text-amber-400" />
                    <span className="text-xs text-amber-400">
                        {needMore}명 더 필요합니다
                    </span>
                </div>
            )}

            {/* Player List */}
            <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {players.map((p) => (
                        <motion.li
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                            className="group bg-surface hover:bg-surface-overlay p-3 rounded-xl flex justify-between items-center border border-slate-800/50 hover:border-slate-700/50 transition-all"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-slate-200 truncate">
                                    {p.name}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <RankBadge
                                        icon={<TankIcon size={12} />}
                                        rank={p.tank}
                                        label={formatRank(p.tank)}
                                    />
                                    <RankBadge
                                        icon={<DamageIcon size={12} />}
                                        rank={p.dps}
                                        label={formatRank(p.dps)}
                                    />
                                    <RankBadge
                                        icon={<SupportIcon size={12} />}
                                        rank={p.sup}
                                        label={formatRank(p.sup)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setPlayers(players.filter(x => x.id !== p.id))}
                                className="ml-2 p-2 rounded-lg text-slate-600 hover:text-danger hover:bg-danger-subtle opacity-0 group-hover:opacity-100 transition-all"
                                aria-label="삭제"
                            >
                                <Trash2 size={16} />
                            </button>
                        </motion.li>
                    ))}
                </AnimatePresence>

                {/* Empty State */}
                {playerCount === 0 && (
                    <motion.li
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                            <Users size={20} className="text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-500">플레이어를 추가해주세요</p>
                        <p className="text-xs text-slate-600 mt-1">디스코드 채팅을 복사해서 붙여넣기</p>
                    </motion.li>
                )}
            </ul>
        </div>
    );
};

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

export default PlayerList;
