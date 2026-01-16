import React from 'react';
import { User, ClipboardPaste, Star } from 'lucide-react';
import { TIERS, TIER_LABEL_MAP } from '../../../constants';

interface PlayerFormProps {
    inputs: any;
    setInputs: React.Dispatch<React.SetStateAction<any>>;
    addPlayer: () => void;
    pasteText: string;
    setPasteText: React.Dispatch<React.SetStateAction<string>>;
    handlePaste: () => void;
}

const PlayerForm = ({ inputs, setInputs, addPlayer, pasteText, setPasteText, handlePaste }: PlayerFormProps) => {

    const togglePref = (key: string) => setInputs((prev: any) => ({ ...prev, [key]: !prev[key] }));

    const inputStyle = "w-full bg-slate-700 border border-slate-600 rounded p-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all";
    const selectStyle = "bg-slate-700 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400";

    const getTierImage = (tier: string): string | undefined => {
        if (!tier) return undefined;
        if (tier === 'UNRANKED') return '/tier/unrank.png';
        return `/tier/${tier.toLowerCase()}.png`;
    };

    const TierSelect = ({ prefix, label, prefKey }: { prefix: string, label: string, prefKey: string }) => {
        const currentTier = inputs[`${prefix}Tier`];
        const tierImg = getTierImage(currentTier);

        return (
            <div className="flex gap-1 flex-1 min-w-[140px]">
                <div className="flex flex-col w-full">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-300 font-medium">{label}</label>
                        <button
                            onClick={() => togglePref(prefKey)}
                            className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${inputs[prefKey] ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}
                        >
                            <Star size={10} fill={inputs[prefKey] ? "currentColor" : "none"}/> 선호
                        </button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="w-9 h-9 flex items-center justify-center bg-slate-800 rounded border border-slate-600 shrink-0 overflow-hidden p-1">
                            {tierImg && (
                                <img
                                    src={tierImg}
                                    alt={currentTier}
                                    className="w-full h-full object-contain"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            )}
                        </div>
                        <div className="flex gap-1 flex-1">
                            <select
                                className={`${selectStyle} flex-1`}
                                value={inputs[`${prefix}Tier`]}
                                onChange={(e) => setInputs({...inputs, [`${prefix}Tier`]: e.target.value})}
                            >
                                {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL_MAP[t]}</option>)}
                            </select>
                            <select
                                className={`${selectStyle} w-16 text-center`}
                                value={inputs[`${prefix}Div`]}
                                onChange={(e) => setInputs({...inputs, [`${prefix}Div`]: e.target.value})}
                            >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[#1e2330] border border-slate-700 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-white">
                <User size={20} className="text-blue-400"/> 플레이어 추가
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-slate-400 mb-1 ml-1">닉네임</label>
                    <input
                        placeholder="예: 홍길동#1234"
                        className={inputStyle}
                        value={inputs.name}
                        onChange={(e) => setInputs({...inputs, name: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <TierSelect prefix="t" label="🛡️ 탱커" prefKey="tPref" />
                    <TierSelect prefix="d" label="⚔️ 딜러" prefKey="dPref" />
                    <TierSelect prefix="s" label="❤️ 힐러" prefKey="sPref" />
                </div>
                <button
                    onClick={addPlayer}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 mt-2"
                >
                    추가하기
                </button>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700">
                <details className="text-sm group">
                    <summary className="cursor-pointer text-slate-300 hover:text-white flex items-center gap-2 font-medium select-none mb-2">
                        <ClipboardPaste size={16} className="text-blue-400"/> 디스코드 채팅 붙여넣기
                    </summary>
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <textarea
                className={`${inputStyle} h-40 leading-relaxed font-mono text-xs`}
                placeholder={`채팅 로그를 붙여넣으세요!`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
            />
                        <button
                            onClick={handlePaste}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                        >
                            분석해서 추가하기
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default PlayerForm;