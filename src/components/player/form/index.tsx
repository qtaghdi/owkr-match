import React, { useState } from 'react';
import { User, MessageSquareText, Sparkles, AlertCircle, X, History, Check, Loader2 } from 'lucide-react';
import { formatRank } from '../../../constants';
import { Player } from '../../../types';
import TierSelect from './tier-select';

interface HistoryPlayer {
    name: string;
    tank: Player['tank'];
    dps: Player['dps'];
    sup: Player['sup'];
    noMic?: boolean;
}

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
    failedParses: string[];
    setFailedParses: React.Dispatch<React.SetStateAction<string[]>>;
    history?: HistoryPlayer[];
    historyLoading?: boolean;
    historyError?: string | null;
    onFetchHistory?: () => void;
    onAddFromHistory?: (players: HistoryPlayer[]) => void;
}

type InputMode = 'discord' | 'manual';

const PlayerForm = ({ inputs, setInputs, addPlayer, pasteText, setPasteText, handlePaste, failedParses, setFailedParses, history = [], historyLoading, historyError, onFetchHistory, onAddFromHistory }: PlayerFormProps) => {
    const [mode, setMode] = useState<InputMode>('discord');
    const [showHistory, setShowHistory] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<Set<string>>(new Set());

    const handleRemoveFailed = (name: string) => {
        setFailedParses(prev => prev.filter(n => n !== name));
    };

    const handleUseForManualInput = (name: string) => {
        setInputs(prev => ({ ...prev, name }));
        setFailedParses(prev => prev.filter(n => n !== name));
        setMode('manual');
    };

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
                        <TierSelect prefix="t" label="탱커" prefKey="tPref" inputs={inputs} setInputs={setInputs} />
                        <TierSelect prefix="d" label="딜러" prefKey="dPref" inputs={inputs} setInputs={setInputs} />
                        <TierSelect prefix="s" label="힐러" prefKey="sPref" inputs={inputs} setInputs={setInputs} />
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

            {/* History Section */}
            {onFetchHistory && (
                <div className="mt-5">
                    <button
                        onClick={() => {
                            if (!showHistory) onFetchHistory();
                            setShowHistory(!showHistory);
                            setSelectedHistory(new Set());
                        }}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <History size={14} />
                        최근 참가자
                    </button>

                    {showHistory && (
                        <div className="mt-3 p-3 bg-surface rounded-xl border border-slate-800 animate-fade-in">
                            {historyLoading && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 size={16} className="animate-spin text-slate-500" />
                                </div>
                            )}
                            {historyError && (
                                <p className="text-xs text-slate-500 text-center py-2">{historyError}</p>
                            )}
                            {!historyLoading && !historyError && history.length === 0 && (
                                <p className="text-xs text-slate-500 text-center py-2">저장된 참가자가 없습니다</p>
                            )}
                            {!historyLoading && history.length > 0 && (
                                <>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {history.map((p) => {
                                            const isSelected = selectedHistory.has(p.name);
                                            return (
                                                <button
                                                    key={p.name}
                                                    onClick={() => {
                                                        setSelectedHistory(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(p.name)) next.delete(p.name);
                                                            else next.add(p.name);
                                                            return next;
                                                        });
                                                    }}
                                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                                        isSelected ? 'bg-accent/20 text-white' : 'hover:bg-slate-800 text-slate-300'
                                                    }`}
                                                >
                                                    <span className="truncate">{p.name}</span>
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        {formatRank(p.tank)}/{formatRank(p.dps)}/{formatRank(p.sup)}
                                                        {isSelected && <Check size={12} className="text-accent" />}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedHistory.size > 0 && (
                                        <button
                                            onClick={() => {
                                                const selected = history.filter(p => selectedHistory.has(p.name));
                                                onAddFromHistory?.(selected);
                                                setSelectedHistory(new Set());
                                                setShowHistory(false);
                                            }}
                                            className="btn-primary w-full mt-3 text-xs"
                                        >
                                            {selectedHistory.size}명 추가
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Failed Parses Section */}
            {failedParses.length > 0 && (
                <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">
                            파싱 실패 ({failedParses.length}명)
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                        클릭하면 수동 입력으로 이동합니다
                    </p>
                    <div className="space-y-2">
                        {failedParses.map((name) => (
                            <div
                                key={name}
                                className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2 group"
                            >
                                <button
                                    onClick={() => handleUseForManualInput(name)}
                                    className="text-sm text-slate-300 hover:text-white transition-colors text-left flex-1"
                                >
                                    {name}
                                </button>
                                <button
                                    onClick={() => handleRemoveFailed(name)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerForm;
