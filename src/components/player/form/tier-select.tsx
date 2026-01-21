import React from 'react';
import { Star, ChevronDown } from 'lucide-react';
import { TIERS, TIER_LABEL_MAP } from '../../../constants';
import { getTierImage } from '../../../utils/tier';

interface TierSelectProps {
    prefix: 't' | 'd' | 's';
    label: string;
    prefKey: 'tPref' | 'dPref' | 'sPref';
    inputs: {
        tTier: string; tDiv: string; tPref: boolean;
        dTier: string; dDiv: string; dPref: boolean;
        sTier: string; sDiv: string; sPref: boolean;
    };
    setInputs: React.Dispatch<React.SetStateAction<TierSelectProps['inputs'] & { name: string }>>;
}

const TierSelect = ({ prefix, label, prefKey, inputs, setInputs }: TierSelectProps) => {
    const tierKey = `${prefix}Tier` as 'tTier' | 'dTier' | 'sTier';
    const divKey = `${prefix}Div` as 'tDiv' | 'dDiv' | 'sDiv';
    const currentTier = inputs[tierKey];
    const tierImg = getTierImage(currentTier);

    const togglePref = () => {
        setInputs(prev => ({ ...prev, [prefKey]: !prev[prefKey] }));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-400">{label}</span>
                <button
                    type="button"
                    onClick={togglePref}
                    className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                        inputs[prefKey]
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <Star size={10} fill={inputs[prefKey] ? "currentColor" : "none"} />
                    선호
                </button>
            </div>
            <div className="flex gap-2 items-center">
                <div className="w-10 h-10 flex items-center justify-center bg-surface rounded-lg border border-slate-700/50 shrink-0 overflow-hidden p-1.5">
                    {tierImg && (
                        <img
                            src={tierImg}
                            alt={currentTier}
                            className="w-full h-full object-contain"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                    )}
                </div>
                <div className="flex gap-2 flex-1">
                    <div className="relative flex-1">
                        <select
                            className="input-base pr-8 appearance-none cursor-pointer"
                            value={currentTier}
                            onChange={(e) => setInputs(prev => ({ ...prev, [tierKey]: e.target.value }))}
                        >
                            {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL_MAP[t]}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                    <div className="relative w-20">
                        <select
                            className="input-base text-center appearance-none cursor-pointer"
                            value={inputs[divKey]}
                            onChange={(e) => setInputs(prev => ({ ...prev, [divKey]: e.target.value }))}
                        >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierSelect;
