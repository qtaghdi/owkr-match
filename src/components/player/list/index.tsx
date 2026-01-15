import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from 'src/types';
import { DamageIcon, SupportIcon, TankIcon } from '../../roles/icon';
import {formatRank} from "src/constants";

interface PlayerListProps {
    players: Player[];
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}


const PlayerList = ({ players = [], setPlayers }: PlayerListProps) => {
    if (!players) return null;

    return (
        <div className="bg-[#151821] border border-slate-800 rounded-xl p-5 shadow-lg min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
                {/* 여기서 players가 undefined면 에러가 났던 것입니다 */}
                <h2 className="text-lg font-bold text-white">
                    대기 명단 <span className="text-blue-400 text-sm ml-1">{players.length}/10</span>
                </h2>
                <button onClick={() => setPlayers([])} className="text-xs text-red-400 hover:underline">전체 삭제</button>
            </div>
            {/* ... 나머지 코드 동일 ... */}
            <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence>
                    {players.map((p) => (
                        <motion.li
                            key={p.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-slate-800/50 p-3 rounded flex justify-between items-center text-sm border border-slate-700/50"
                        >
                            <div>
                                <div className="font-bold text-slate-200">{p.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 space-x-2 flex">
                                    <span className={`flex items-center gap-1 ${p.tank.isPreferred ? "text-yellow-400 font-bold" : ""}`}>
                                        <TankIcon size={12} /> {formatRank(p.tank)}
                                    </span>
                                    <span className={`flex items-center gap-1 ${p.dps.isPreferred ? "text-yellow-400 font-bold" : ""}`}>
                                        <DamageIcon size={12} /> {formatRank(p.dps)}
                                    </span>
                                    <span className={`flex items-center gap-1 ${p.sup.isPreferred ? "text-yellow-400 font-bold" : ""}`}>
                                        <SupportIcon size={12} /> {formatRank(p.sup)}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setPlayers(players.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-red-400 p-1">
                                <Trash2 size={16} />
                            </button>
                        </motion.li>
                    ))}
                </AnimatePresence>
                {players.length === 0 && <li className="text-center text-slate-600 py-8 text-sm">플레이어를 추가해주세요.</li>}
            </ul>
        </div>
    );
};

export default PlayerList;