import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ListChecks, MessageSquareText, Pencil, Sparkles, User, X } from 'lucide-react';
import type { Player } from '../../../types';
import TierSelect from './tier-select';
import ParticipantChecker from './participant-checker';

export type PlayerInputMode = 'discord' | 'manual' | 'mentions';

interface PlayerFormProps {
    players: Player[];
    inputs: {
        name: string;
        discordName: string;
        tTier: string; tDiv: string; tPref: boolean; tAvoid: boolean;
        dTier: string; dDiv: string; dPref: boolean; dAvoid: boolean;
        sTier: string; sDiv: string; sPref: boolean; sAvoid: boolean;
    };
    setInputs: React.Dispatch<React.SetStateAction<PlayerFormProps['inputs']>>;
    addPlayer: () => void;
    pasteText: string;
    setPasteText: React.Dispatch<React.SetStateAction<string>>;
    handlePaste: () => void;
    failedParses: string[];
    setFailedParses: React.Dispatch<React.SetStateAction<string[]>>;
    isCollapsed: boolean;
    summary: string;
    onExpand: () => void;
    onCollapse: () => void;
    mode: PlayerInputMode;
    onModeChange: (mode: PlayerInputMode) => void;
    isEditing: boolean;
    onCancelEdit: () => void;
}

/**
 * @description 참가자 입력을 제공하고 성공 후에는 한 줄 요약으로 접힌다.
 */
const PlayerForm = ({
    players,
    inputs,
    setInputs,
    addPlayer,
    pasteText,
    setPasteText,
    handlePaste,
    failedParses,
    setFailedParses,
    isCollapsed,
    summary,
    onExpand,
    onCollapse,
    mode,
    onModeChange,
    isEditing,
    onCancelEdit,
}: PlayerFormProps) => {
    const reduceMotion = useReducedMotion();
    const animation = reduceMotion
        ? { duration: 0 }
        : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };
    const collapsedMessage = isEditing
        ? `참가자 수정 중 · ${inputs.discordName || inputs.name}`
        : failedParses.length > 0
            ? `읽지 못한 항목 ${failedParses.length}명 확인 필요`
            : summary || '참가자 입력이 접혀 있습니다';

    const handleRemoveFailed = (name: string) => {
        setFailedParses(prev => prev.filter(n => n !== name));
    };

    const handleUseForManualInput = (name: string) => {
        setInputs(prev => ({ ...prev, name }));
        setFailedParses(prev => prev.filter(n => n !== name));
        onModeChange('manual');
    };

    return (
        <section className="card shrink-0 overflow-hidden p-0" aria-label="참가자 입력">
            <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {isCollapsed ? (
                        failedParses.length > 0 ? (
                            <AlertCircle size={17} className="shrink-0 text-amber-400" aria-hidden="true" />
                        ) : isEditing ? (
                            <Pencil size={17} className="shrink-0 text-cyan-300" aria-hidden="true" />
                        ) : summary ? (
                            <CheckCircle2 size={17} className="shrink-0 text-emerald-400" aria-hidden="true" />
                        ) : (
                            <User size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
                        )
                    ) : (
                        <User size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                    {isCollapsed ? (
                        <p className="min-w-0 flex-1 truncate text-sm text-slate-300" role="status">
                            {collapsedMessage}
                        </p>
                    ) : (
                        <h2 className="truncate text-sm font-semibold text-white">참가자 입력</h2>
                    )}
                </div>
                <button
                    type="button"
                    onClick={isCollapsed ? onExpand : onCollapse}
                    className={`inline-flex min-h-9 shrink-0 touch-manipulation items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                        isCollapsed
                            ? 'text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                    aria-label={isCollapsed ? '참가자 입력 폼 다시 열기' : '참가자 입력 폼 접기'}
                    aria-expanded={!isCollapsed}
                    aria-controls="player-input-content"
                >
                    {isCollapsed ? (
                        <>
                            다시 열기
                            <ChevronDown size={14} aria-hidden="true" />
                        </>
                    ) : (
                        <>
                            접기
                            <ChevronUp size={14} aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>

            <AnimatePresence initial={false}>
                {!isCollapsed ? (
                    <motion.div
                        id="player-input-content"
                        key="input-content"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={animation}
                        className="overflow-hidden"
                    >
                        <div className="custom-scrollbar max-h-[calc(52dvh-3.5rem)] overflow-y-auto overscroll-contain px-4 pb-4 pr-3 xl:max-h-[calc(44dvh-3.5rem)]">

                            {/* Tab Navigation */}
                            <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1" role="group" aria-label="입력 방식">
                            <button
                                type="button"
                                aria-pressed={mode === 'discord'}
                                onClick={() => onModeChange('discord')}
                                className={`flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'discord'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <MessageSquareText size={16} aria-hidden="true" />
                                채팅 붙여넣기
                            </button>
                            <button
                                type="button"
                                aria-pressed={mode === 'manual'}
                                onClick={() => onModeChange('manual')}
                                className={`flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'manual'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <User size={16} aria-hidden="true" />
                                수동 입력
                            </button>
                            <button
                                type="button"
                                aria-pressed={mode === 'mentions'}
                                onClick={() => onModeChange('mentions')}
                                className={`flex min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                                    mode === 'mentions'
                                        ? 'bg-accent text-white shadow-lg shadow-accent/25'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <ListChecks size={16} aria-hidden="true" />
                                참여 대조
                            </button>
                        </div>

                        {/* Discord Parsing Mode */}
                        {mode === 'discord' && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="discord-chat" className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                                        <Sparkles size={14} className="text-accent" aria-hidden="true" />
                                        디스코드 채팅 내용을 그대로 붙여넣으세요
                                    </label>
                                    <textarea
                                        id="discord-chat"
                                        name="discord-chat"
                                        autoComplete="off"
                                        spellCheck={false}
                                        className="input-base h-40 resize-none font-mono text-sm leading-relaxed"
                                        placeholder={`예시:\nkimjungun#11853 다5/다1/다5\n학살#38848 다3/마4/다4\nAki#34981 미배치(골)/미배치(플)/플2\n재봉이#31207 그5!/마1!/마4`}
                                        value={pasteText}
                                        onChange={(event) => setPasteText(event.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePaste}
                                    disabled={!pasteText.trim()}
                                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    명단에 추가
                                </button>
                                <p className="text-center text-xs text-slate-500">
                                    <span className="font-semibold text-amber-400">!</span>는 선호,
                                    {' '}<span className="font-semibold text-rose-400">?</span>는 비선호 포지션입니다
                                </p>
                            </div>
                        )}

                        {/* Manual Input Mode */}
                        {mode === 'manual' && (
                            <div className="space-y-4 animate-fade-in">
                                {isEditing && (
                                    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2" role="status">
                                        <Pencil size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-cyan-100">
                                            참가자 정보 수정 중
                                        </p>
                                        <button
                                            type="button"
                                            onClick={onCancelEdit}
                                            className="inline-flex min-h-8 shrink-0 touch-manipulation items-center rounded-md px-2 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                                        >
                                            수정 취소
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="battle-tag" className="mb-2 block text-xs font-medium text-slate-400">배틀태그</label>
                                    <input
                                        id="battle-tag"
                                        name="battle-tag"
                                        type="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="닉네임#1234"
                                        className="input-base"
                                        value={inputs.name}
                                        onChange={(event) => setInputs(prev => ({ ...prev, name: event.target.value }))}
                                        onKeyDown={(event) => event.key === 'Enter' && addPlayer()}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="discord-name" className="mb-2 block text-xs font-medium text-slate-400">디스코드 닉네임 (선택)</label>
                                    <input
                                        id="discord-name"
                                        name="discord-name"
                                        type="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="서버에서 사용하는 닉네임"
                                        className="input-base"
                                        value={inputs.discordName}
                                        onChange={(event) => setInputs(prev => ({ ...prev, discordName: event.target.value }))}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <TierSelect prefix="t" label="탱커" prefKey="tPref" avoidKey="tAvoid" inputs={inputs} setInputs={setInputs} />
                                    <TierSelect prefix="d" label="딜러" prefKey="dPref" avoidKey="dAvoid" inputs={inputs} setInputs={setInputs} />
                                    <TierSelect prefix="s" label="힐러" prefKey="sPref" avoidKey="sAvoid" inputs={inputs} setInputs={setInputs} />
                                </div>

                                <button
                                    type="button"
                                    onClick={addPlayer}
                                    disabled={!inputs.name.trim()}
                                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isEditing ? '변경사항 저장' : '플레이어 추가'}
                                </button>
                            </div>
                        )}

                        {mode === 'mentions' && (
                            <ParticipantChecker players={players} />
                        )}

                        {/* Failed Parses Section */}
                        {failedParses.length > 0 && (
                            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 animate-fade-in" role="status" aria-live="polite">
                                <div className="mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-amber-400" aria-hidden="true" />
                                    <span className="text-sm font-medium text-amber-400">
                                        읽지 못한 항목 ({failedParses.length}명)
                                    </span>
                                </div>
                                <p className="mb-3 text-xs text-slate-400">
                                    이름을 누르면 직접 입력으로 옮겨집니다
                                </p>
                                <div className="space-y-2">
                                    {failedParses.map((name) => (
                                        <div
                                            key={name}
                                            className="group flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleUseForManualInput(name)}
                                                className="min-h-8 flex-1 text-left text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                                            >
                                                {name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFailed(name)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                                                aria-label={`${name} 실패 항목 삭제`}
                                            >
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
};

export default PlayerForm;
