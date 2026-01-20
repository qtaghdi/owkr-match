import React, { useState } from 'react';
import { User, MessageSquareText, Sparkles } from 'lucide-react';
import TierSelect from './tier-select';

interface PlayerFormProps {
    inputs: {
        name: string;
        tTier: string; tDiv: string; tPref: boolean;
        dTier: string; dDiv: string; dPref: boolean;
        sTier: string; sDiv: string; sPref: boolean;
    };
    setInputs: React.Dispatch<React.SetStateAction<PlayerFormProps['inputs']>>;
    addPlayer: () => void;
    pasteText: string;
    setPasteText: React.Dispatch<React.SetStateAction<string>>;
    handlePaste: () => void;
}

type InputMode = 'discord' | 'manual';

const PlayerForm = ({ inputs, setInputs, addPlayer, pasteText, setPasteText, handlePaste }: PlayerFormProps) => {
    const [mode, setMode] = useState<InputMode>('discord');

    return (
        <div className="card">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-surface rounded-xl mb-5">
                <button
                    onClick={() => setMode('discord')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        mode === 'discord'
                            ? 'bg-accent text-white shadow-lg shadow-accent/25'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                >
                    <MessageSquareText size={16} />
                    디스코드 파싱
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        mode === 'manual'
                            ? 'bg-accent text-white shadow-lg shadow-accent/25'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                >
                    <User size={16} />
                    수동 입력
                </button>
            </div>

            {/* Discord Parsing Mode */}
            {mode === 'discord' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-accent" />
                            <span className="text-xs text-slate-400">
                                디스코드 채팅을 복사해서 붙여넣으세요
                            </span>
                        </div>
                        <textarea
                            className="input-base h-48 leading-relaxed font-mono text-xs resize-none"
                            placeholder={`예시:\nkimjungun#11853 다5/다1/다5\n학살#38848 다3/마4/다4\nAki#34981 미배치(골)/미배치(플)/플2\n재봉이#31207 그5!/마1!/마4`}
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handlePaste}
                        disabled={!pasteText.trim()}
                        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        플레이어 추가하기
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                        티어 뒤에 <span className="text-amber-400 font-semibold">!</span>를 붙이면 선호 포지션으로 설정됩니다
                    </p>
                </div>
            )}

            {/* Manual Input Mode */}
            {mode === 'manual' && (
                <div className="space-y-5 animate-fade-in">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">배틀태그</label>
                        <input
                            placeholder="닉네임#1234"
                            className="input-base"
                            value={inputs.name}
                            onChange={(e) => setInputs(prev => ({ ...prev, name: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                        />
                    </div>

                    <div className="space-y-4">
                        <TierSelect prefix="t" label="🛡️ 탱커" prefKey="tPref" inputs={inputs} setInputs={setInputs} />
                        <TierSelect prefix="d" label="⚔️ 딜러" prefKey="dPref" inputs={inputs} setInputs={setInputs} />
                        <TierSelect prefix="s" label="💚 힐러" prefKey="sPref" inputs={inputs} setInputs={setInputs} />
                    </div>

                    <button
                        onClick={addPlayer}
                        disabled={!inputs.name.trim()}
                        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        플레이어 추가
                    </button>
                </div>
            )}
        </div>
    );
};

export default PlayerForm;
