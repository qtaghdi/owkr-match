import { useState, useEffect, useRef } from 'react';
import { Shuffle, RefreshCcw, Loader2, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, getScore } from './constants';
import { parseMultipleLines } from './utils/parser';
import { recalculateMatchResult } from './utils/balance';
import { isMatchResultStale, mergePlayersByBattleTag, syncMatchResultPlayerIdentities } from './utils/player';
import { setWithExpiry, getWithExpiry, removeItem, cleanupExpired } from './utils/storage';
import { useBalance } from './hooks/use-balance';
import { useAuth } from './hooks/use-auth';
import type { MatchResultData, Player, Role, SwapSource, Tier } from './types';
import PlayerForm, { type PlayerInputMode } from './components/player/form';
import PlayerList from './components/player/list';
import MatchResult from './components/match/result';
import LoginScreen from './components/auth/login-screen';
import LoadingScreen from './components/common/loading-screen';

const STORAGE_KEYS = {
    PLAYERS: 'owkr_players',
    RESULT: 'owkr_result'
};

interface StoredMatchState {
    result: MatchResultData;
    alternatives: MatchResultData[];
}

const normalizePlayerName = (name: string) => name.trim().toLowerCase();

const createDefaultPlayerInputs = () => ({
    name: '',
    discordName: '',
    tTier: 'DIAMOND', tDiv: '3', tPref: false, tAvoid: false,
    dTier: 'DIAMOND', dDiv: '3', dPref: false, dAvoid: false,
    sTier: 'PLATINUM', sDiv: '3', sPref: false, sAvoid: false
});

const getEditableDivision = (tier: string, division: number | string) => {
    if (tier === 'UNRANKED') return '0';
    const value = String(division);
    return ['1', '2', '3', '4', '5'].includes(value) ? value : '3';
};

const App = () => {
    const { user, isLoading } = useAuth();

    const [players, setPlayers] = useState<Player[]>(() => {
        return getWithExpiry<Player[]>(STORAGE_KEYS.PLAYERS) || [];
    });
    const [initialMatchState] = useState<StoredMatchState | null>(() => {
        const savedState = getWithExpiry<MatchResultData | StoredMatchState>(STORAGE_KEYS.RESULT);
        if (!savedState) return null;

        const savedResult = 'result' in savedState ? savedState.result : savedState;
        const savedAlternatives = 'result' in savedState ? savedState.alternatives : [];

        return {
            result: syncMatchResultPlayerIdentities(savedResult, players),
            alternatives: savedAlternatives.map(alternative => (
                syncMatchResultPlayerIdentities(alternative, players)
            )),
        };
    });
    const initialParticipantsRef = useRef(players.slice(0, 10));

    const { balanceTeams, result, setResult, alternatives, setAlternatives, isBalancing } = useBalance(
        initialMatchState?.result ?? null,
        initialMatchState?.alternatives ?? [],
    );

    const isMounted = useRef(false);

    useEffect(() => {
        // 앱 시작 시 만료된 데이터 정리
        cleanupExpired();
        isMounted.current = true;

        if (initialMatchState) {
            const initialParticipants = initialParticipantsRef.current;
            const shouldGenerateAlternatives = initialMatchState.alternatives.length === 0
                && initialParticipants.length === 10
                && !isMatchResultStale(initialMatchState.result, initialParticipants);
            if (shouldGenerateAlternatives) {
                void balanceTeams(initialParticipants, { preserveResult: initialMatchState.result })
                    .catch(() => undefined);
            }
        }
    }, [balanceTeams, initialMatchState]);

    useEffect(() => {
        if (players.length > 0) {
            setWithExpiry(STORAGE_KEYS.PLAYERS, players);
        } else {
            removeItem(STORAGE_KEYS.PLAYERS);
        }
    }, [players]);

    useEffect(() => {
        if (!isMounted.current) return;

        if (result) {
            setWithExpiry<StoredMatchState>(STORAGE_KEYS.RESULT, { result, alternatives });
        } else {
            removeItem(STORAGE_KEYS.RESULT);
        }
    }, [alternatives, result]);

    const [inputs, setInputs] = useState(createDefaultPlayerInputs);
    const [pasteText, setPasteText] = useState('');
    const [failedParses, setFailedParses] = useState<string[]>([]);
    const [inputMode, setInputMode] = useState<PlayerInputMode>('discord');
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [isInputCollapsed, setIsInputCollapsed] = useState(players.length > 0);
    const [inputSummary, setInputSummary] = useState(
        players.length > 0 ? `저장된 참가자 ${players.length}명 불러옴` : '',
    );
    const [swapSource, setSwapSource] = useState<SwapSource | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        };
    }, []);

    const addPlayer = () => {
        if (!inputs.name.trim()) {
            setIsInputCollapsed(false);
            showToast('error', '배틀태그를 입력해주세요.');
            return;
        }
        const normalizedName = normalizePlayerName(inputs.name);
        if (players.some(player => (
            player.id !== editingPlayerId
            && normalizePlayerName(player.name) === normalizedName
        ))) {
            setIsInputCollapsed(false);
            showToast('error', '이미 추가된 플레이어입니다.');
            return;
        }
        const tTier = inputs.tTier as Tier;
        const dTier = inputs.dTier as Tier;
        const sTier = inputs.sTier as Tier;
        const existingPlayer = editingPlayerId === null
            ? undefined
            : players.find(player => player.id === editingPlayerId);
        if (editingPlayerId !== null && !existingPlayer) {
            setEditingPlayerId(null);
            setInputs(createDefaultPlayerInputs());
            showToast('error', '수정할 참가자를 찾지 못했습니다.');
            return;
        }
        const willJoinWaitlist = editingPlayerId === null && players.length >= 10;
        const newPlayer: Player = {
            id: editingPlayerId ?? Date.now(),
            name: inputs.name.trim(),
            discordName: inputs.discordName.trim() || undefined,
            tank: { tier: tTier, div: inputs.tDiv, score: getScore(TIERS.indexOf(tTier), inputs.tDiv), isPreferred: inputs.tPref, isAvoided: inputs.tAvoid },
            dps: { tier: dTier, div: inputs.dDiv, score: getScore(TIERS.indexOf(dTier), inputs.dDiv), isPreferred: inputs.dPref, isAvoided: inputs.dAvoid },
            sup: { tier: sTier, div: inputs.sDiv, score: getScore(TIERS.indexOf(sTier), inputs.sDiv), isPreferred: inputs.sPref, isAvoided: inputs.sAvoid },
            noMic: existingPlayer?.noMic,
        };
        const isEditing = editingPlayerId !== null;
        setPlayers(prev => isEditing
            ? prev.map(player => player.id === editingPlayerId ? newPlayer : player)
            : [...prev, newPlayer]);
        setInputs(createDefaultPlayerInputs());
        setEditingPlayerId(null);
        if (failedParses.length === 0) {
            setInputSummary(isEditing
                ? `참가자 수정 완료 · ${newPlayer.discordName ?? newPlayer.name}`
                : `참가자 1명 추가 완료 · ${newPlayer.discordName ?? newPlayer.name}`);
            setIsInputCollapsed(true);
        } else {
            setIsInputCollapsed(false);
        }
        showToast('success', isEditing
            ? '참가자 정보를 수정했습니다.'
            : willJoinWaitlist ? '정원 초과로 대기열에 추가했습니다.' : '플레이어를 추가했습니다.');
    };

    const handleEditPlayer = (player: Player) => {
        setInputs({
            name: player.name,
            discordName: player.discordName ?? '',
            tTier: player.tank.tier,
            tDiv: getEditableDivision(player.tank.tier, player.tank.div),
            tPref: player.tank.isPreferred,
            tAvoid: player.tank.isAvoided,
            dTier: player.dps.tier,
            dDiv: getEditableDivision(player.dps.tier, player.dps.div),
            dPref: player.dps.isPreferred,
            dAvoid: player.dps.isAvoided,
            sTier: player.sup.tier,
            sDiv: getEditableDivision(player.sup.tier, player.sup.div),
            sPref: player.sup.isPreferred,
            sAvoid: player.sup.isAvoided,
        });
        setEditingPlayerId(player.id);
        setInputMode('manual');
        setIsInputCollapsed(false);
    };

    const handleCancelEdit = () => {
        setEditingPlayerId(null);
        setInputs(createDefaultPlayerInputs());
    };

    const handlePaste = () => {
        if (!pasteText.trim()) {
            setIsInputCollapsed(false);
            showToast('error', '붙여넣을 디스코드 채팅이 없습니다.');
            return;
        }
        const { players: parsedPlayers, failedLines } = parseMultipleLines(pasteText);
        const merged = mergePlayersByBattleTag(players, parsedPlayers);
        const waitlistCount = Math.max(merged.players.length - 10, 0);

        if (merged.addedCount > 0 || merged.updatedDiscordNameCount > 0) {
            setPlayers(merged.players);
        }
        if (merged.updatedDiscordNameCount > 0) {
            setResult(current => current
                ? syncMatchResultPlayerIdentities(current, merged.players)
                : null);
            setAlternatives(current => current.map(alternative => (
                syncMatchResultPlayerIdentities(alternative, merged.players)
            )));
        }
        if (failedLines.length > 0) {
            setFailedParses(prev => [...new Set([...prev, ...failedLines])]);
        }
        const updateText = merged.updatedDiscordNameCount > 0
            ? `, 디스코드 이름 ${merged.updatedDiscordNameCount}명 갱신`
            : '';
        const duplicateText = merged.unchangedDuplicateCount > 0
            ? `, 중복 ${merged.unchangedDuplicateCount}명 제외`
            : '';

        if (merged.addedCount === 0 && merged.updatedDiscordNameCount === 0) {
            if (merged.unchangedDuplicateCount > 0) {
                showToast('error', '이미 추가된 플레이어만 포함되어 있습니다.');
            } else {
                showToast('error', '읽어낸 플레이어가 없습니다.');
            }
        } else if (merged.addedCount === 0) {
            showToast('success', `${merged.updatedDiscordNameCount}명의 디스코드 이름을 갱신했습니다.`);
        } else if (waitlistCount > 0) {
            showToast('success', `${merged.addedCount}명 추가, ${waitlistCount}명은 대기열로 이동${updateText}${duplicateText}`);
        } else if (failedLines.length > 0 || merged.unchangedDuplicateCount > 0) {
            const failedText = failedLines.length > 0 ? `, ${failedLines.length}명은 직접 확인 필요` : '';
            showToast('error', `${merged.addedCount}명 추가${updateText}${failedText}${duplicateText}`);
        } else {
            showToast('success', `${merged.addedCount}명을 추가했습니다${updateText}.`);
        }

        const hasIssues = failedLines.length > 0
            || failedParses.length > 0
            || merged.unchangedDuplicateCount > 0
            || (merged.addedCount === 0 && merged.updatedDiscordNameCount === 0);
        if (hasIssues) {
            setIsInputCollapsed(false);
        } else {
            const identityUpdateSummary = merged.updatedDiscordNameCount > 0
                ? ` · 디스코드 이름 ${merged.updatedDiscordNameCount}명 갱신`
                : '';
            setInputSummary(`Discord 채팅 ${parsedPlayers.length}명 파싱 완료 · ${merged.addedCount}명 추가${identityUpdateSummary}`);
            setIsInputCollapsed(true);
            setPasteText('');
            setEditingPlayerId(null);
            setInputs(createDefaultPlayerInputs());
        }
    };

    const handleRunMatching = async () => {
        if (!isReady) {
            showToast('error', '팀을 짜려면 참가자 10명이 필요합니다.');
            return;
        }
        setAlternatives([]);
        setSwapSource(null);
        const participants = players.slice(0, 10);
        try {
            await balanceTeams(participants);
        } catch (error) {
            const message = error instanceof Error ? error.message : '매칭 중 오류가 발생했습니다.';
            showToast('error', message);
        }
    };

    const handleSlotClick = (teamIdx: number, role: Role, idx: number) => {
        if (!result) return;
        if (swapSource) {
            if (swapSource.teamIdx === teamIdx && swapSource.role === role && swapSource.index === idx) {
                setSwapSource(null);
                return;
            }
            const newResult = structuredClone(result);
            const teamNames: ('teamA' | 'teamB')[] = ['teamA', 'teamB'];
            const sourceTeam = teamNames[swapSource.teamIdx];
            const targetTeam = teamNames[teamIdx];

            const sourcePlayer = newResult[sourceTeam].assignment[swapSource.role][swapSource.index];
            const targetPlayer = newResult[targetTeam].assignment[role][idx];

            newResult[sourceTeam].assignment[swapSource.role][swapSource.index] = targetPlayer;
            newResult[targetTeam].assignment[role][idx] = sourcePlayer;

            setResult(recalculateMatchResult(newResult));
            setSwapSource(null);
            showToast('success', '포지션을 교체했습니다.');
        } else {
            setSwapSource({ teamIdx, role, index: idx });
        }
    };

    // 참여자 제거 시 대기자 자동 승격 처리
    const handleRemovePlayer = (playerId: number) => {
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        if (editingPlayerId === playerId) {
            handleCancelEdit();
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!user) return <LoginScreen />;

    // 참여 명단 (첫 10명)과 대기 명단 (나머지) 분리
    const participants = players.slice(0, 10);
    const waitlist = players.slice(10);
    const isReady = participants.length === 10;
    const isResultStale = result ? isMatchResultStale(result, participants) : false;

    return (
        <div className="min-h-screen bg-surface text-slate-200 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-8">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"
                    >
                        OWKR Match
                    </motion.h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {user.username}
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                await fetch('/api/auth/logout', { method: 'POST' });
                                window.location.reload();
                            }}
                            className="btn-ghost text-xs flex items-center gap-1.5"
                        >
                            <LogOut size={14} aria-hidden="true" />
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
                <div className="grid gap-6 xl:grid-cols-[minmax(400px,460px)_minmax(0,1fr)] xl:items-start">
                    {/* Left Panel - Player Input */}
                    <div className="flex min-h-0 flex-col gap-4 xl:sticky xl:top-24 xl:h-[calc(100dvh-8rem)]">
                        <PlayerForm
                            inputs={inputs}
                            setInputs={setInputs}
                            addPlayer={addPlayer}
                            pasteText={pasteText}
                            setPasteText={setPasteText}
                            handlePaste={handlePaste}
                            failedParses={failedParses}
                            setFailedParses={setFailedParses}
                            isCollapsed={isInputCollapsed}
                            summary={inputSummary}
                            onExpand={() => setIsInputCollapsed(false)}
                            onCollapse={() => setIsInputCollapsed(true)}
                            mode={inputMode}
                            onModeChange={setInputMode}
                            isEditing={editingPlayerId !== null}
                            onCancelEdit={handleCancelEdit}
                        />
                        <PlayerList
                            participants={participants}
                            waitlist={waitlist}
                            onEditPlayer={handleEditPlayer}
                            onRemovePlayer={handleRemovePlayer}
                            onClearAll={() => {
                                setPlayers([]);
                                setInputSummary('');
                                setIsInputCollapsed(false);
                                handleCancelEdit();
                            }}
                        />
                    </div>

                    {/* Right Panel - Match Result */}
                    <div className="min-w-0">
                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <h2 className="text-lg font-semibold text-white">팀 배정 결과</h2>
                            <div className="flex gap-2">
                                {result && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResult(null);
                                            setAlternatives([]);
                                            setSwapSource(null);
                                        }}
                                        className="btn-ghost text-sm flex items-center gap-2"
                                    >
                                        <RefreshCcw size={14} />
                                        결과 지우기
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleRunMatching}
                                    disabled={isBalancing || !isReady}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isBalancing ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Shuffle size={16} />
                                    )}
                                    {isReady
                                        ? isResultStale ? '다시 매칭' : '팀 자동 배정'
                                        : `${10 - participants.length}명 더 필요`}
                                </button>
                            </div>
                        </div>

                        {/* Result Area */}
                        <AnimatePresence mode="wait">
                            {!result ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center"
                                >
                                    {isBalancing ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 size={40} className="text-accent animate-spin" />
                                            <p className="text-slate-500 animate-pulse">최적의 조합을 계산 중…</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                                <Shuffle size={24} className="text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 text-center">
                                                {isReady
                                                    ? '“팀 자동 배정” 버튼을 눌러주세요'
                                                    : `플레이어 ${10 - participants.length}명을 더 추가하면 팀을 짤 수 있습니다`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <MatchResult
                                        matchResult={result}
                                        onSlotClick={handleSlotClick}
                                        swapSource={swapSource}
                                        alternatives={alternatives}
                                        isStale={isResultStale}
                                        isGeneratingAlternatives={isBalancing}
                                        onSelectAlternative={(idx) => {
                                            const alt = alternatives[idx];
                                            if (!alt) return;
                                            const remaining = alternatives.filter((_, i) => i !== idx);
                                            remaining.unshift(result!);
                                            setResult(alt);
                                            setAlternatives(remaining);
                                            setSwapSource(null);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.96 }}
                        className={`fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
                            toast.type === 'error'
                                ? 'border-rose-500/30 bg-rose-950/90 text-rose-100'
                                : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100'
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
