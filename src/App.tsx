import { useState, useEffect, useRef } from 'react';
import { Shuffle, RefreshCcw, Loader2, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, getScore } from './constants';
import { parseMultipleLines } from './utils/parser';
import { recalculateMatchResult } from './utils/balance';
import { setWithExpiry, getWithExpiry, removeItem, cleanupExpired } from './utils/storage';
import { useBalance } from './hooks/use-balance';
import { useAuth } from './hooks/use-auth';
import type { MatchResultData, Player, Role, SwapSource, Tier } from './types';
import PlayerForm from './components/player/form';
import PlayerList from './components/player/list';
import MatchResult from './components/match/result';
import LoginScreen from './components/auth/login-screen';
import LoadingScreen from './components/common/loading-screen';

const STORAGE_KEYS = {
    PLAYERS: 'owkr_players',
    RESULT: 'owkr_result'
};

const normalizePlayerName = (name: string) => name.trim().toLowerCase();

const App = () => {
    const { user, isLoading } = useAuth();

    const [players, setPlayers] = useState<Player[]>(() => {
        return getWithExpiry<Player[]>(STORAGE_KEYS.PLAYERS) || [];
    });

    const { balanceTeams, result, setResult, alternatives, setAlternatives, isBalancing } = useBalance();

    const isMounted = useRef(false);

    useEffect(() => {
        // 앱 시작 시 만료된 데이터 정리
        cleanupExpired();

        const savedResult = getWithExpiry<MatchResultData>(STORAGE_KEYS.RESULT);
        if (savedResult) {
            setResult(savedResult);
        }
        isMounted.current = true;
    }, [setResult]);

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
            setWithExpiry(STORAGE_KEYS.RESULT, result);
        } else {
            removeItem(STORAGE_KEYS.RESULT);
        }
    }, [result]);

    const [inputs, setInputs] = useState({
        name: '',
        discordName: '',
        tTier: 'DIAMOND', tDiv: '3', tPref: false, tAvoid: false,
        dTier: 'DIAMOND', dDiv: '3', dPref: false, dAvoid: false,
        sTier: 'PLATINUM', sDiv: '3', sPref: false, sAvoid: false
    });
    const [pasteText, setPasteText] = useState('');
    const [failedParses, setFailedParses] = useState<string[]>([]);
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
            showToast('error', '배틀태그를 입력해주세요.');
            return;
        }
        const normalizedName = normalizePlayerName(inputs.name);
        if (players.some(player => normalizePlayerName(player.name) === normalizedName)) {
            showToast('error', '이미 추가된 플레이어입니다.');
            return;
        }
        const tTier = inputs.tTier as Tier;
        const dTier = inputs.dTier as Tier;
        const sTier = inputs.sTier as Tier;
        const willJoinWaitlist = players.length >= 10;
        const newPlayer: Player = {
            id: Date.now(),
            name: inputs.name.trim(),
            discordName: inputs.discordName.trim() || undefined,
            tank: { tier: tTier, div: inputs.tDiv, score: getScore(TIERS.indexOf(tTier), inputs.tDiv), isPreferred: inputs.tPref, isAvoided: inputs.tAvoid },
            dps: { tier: dTier, div: inputs.dDiv, score: getScore(TIERS.indexOf(dTier), inputs.dDiv), isPreferred: inputs.dPref, isAvoided: inputs.dAvoid },
            sup: { tier: sTier, div: inputs.sDiv, score: getScore(TIERS.indexOf(sTier), inputs.sDiv), isPreferred: inputs.sPref, isAvoided: inputs.sAvoid },
        };
        setPlayers(prev => [...prev, newPlayer]);
        setInputs(prev => ({
            ...prev,
            name: '',
            discordName: '',
            tPref: false,
            dPref: false,
            sPref: false,
            tAvoid: false,
            dAvoid: false,
            sAvoid: false
        }));
        showToast('success', willJoinWaitlist ? '정원 초과로 대기열에 추가했습니다.' : '플레이어를 추가했습니다.');
    };

    const handlePaste = () => {
        if (!pasteText.trim()) {
            showToast('error', '붙여넣을 디스코드 채팅이 없습니다.');
            return;
        }
        const { players: parsedPlayers, failedLines } = parseMultipleLines(pasteText);
        const existingNames = new Set(players.map(player => normalizePlayerName(player.name)));
        const seenNames = new Set(existingNames);
        const uniquePlayers = parsedPlayers.filter(player => {
            const normalizedName = normalizePlayerName(player.name);
            if (seenNames.has(normalizedName)) return false;
            seenNames.add(normalizedName);
            return true;
        });
        const duplicateCount = parsedPlayers.length - uniquePlayers.length;
        const waitlistCount = Math.max(players.length + uniquePlayers.length - 10, 0);

        if (uniquePlayers.length > 0) {
            setPlayers(prev => [...prev, ...uniquePlayers]);
        }
        if (failedLines.length > 0) {
            setFailedParses(prev => [...prev, ...failedLines]);
        }
        if (uniquePlayers.length === 0) {
            if (duplicateCount > 0) {
                showToast('error', '이미 추가된 플레이어만 포함되어 있습니다.');
            } else {
                showToast('error', '읽어낸 플레이어가 없습니다.');
            }
        } else if (waitlistCount > 0) {
            const skippedText = duplicateCount > 0 ? `, 중복 ${duplicateCount}명 제외` : '';
            showToast('success', `${uniquePlayers.length}명 추가, ${waitlistCount}명은 대기열로 이동${skippedText}`);
        } else if (failedLines.length > 0 || duplicateCount > 0) {
            const failedText = failedLines.length > 0 ? `, ${failedLines.length}명은 직접 확인 필요` : '';
            const duplicateText = duplicateCount > 0 ? `, 중복 ${duplicateCount}명 제외` : '';
            showToast('error', `${uniquePlayers.length}명 추가${failedText}${duplicateText}`);
        } else {
            showToast('success', `${uniquePlayers.length}명을 추가했습니다.`);
        }
        setPasteText('');
    };

    const handleRunMatching = async () => {
        if (!isReady) {
            showToast('error', '팀을 짜려면 참가자 10명이 필요합니다.');
            return;
        }
        setResult(null);
        setAlternatives([]);
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
    };

    if (isLoading) return <LoadingScreen />;
    if (!user) return <LoginScreen />;

    // 참여 명단 (첫 10명)과 대기 명단 (나머지) 분리
    const participants = players.slice(0, 10);
    const waitlist = players.slice(10);
    const isReady = participants.length === 10;

    return (
        <div className="min-h-screen bg-surface text-slate-200 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
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
                            onClick={async () => {
                                await fetch('/api/auth/logout', { method: 'POST' });
                                window.location.reload();
                            }}
                            className="btn-ghost text-xs flex items-center gap-1.5"
                        >
                            <LogOut size={14} />
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Panel - Player Input */}
                    <div className="lg:col-span-4 space-y-6">
                        <PlayerForm
                            inputs={inputs}
                            setInputs={setInputs}
                            addPlayer={addPlayer}
                            pasteText={pasteText}
                            setPasteText={setPasteText}
                            handlePaste={handlePaste}
                            failedParses={failedParses}
                            setFailedParses={setFailedParses}
                        />
                        <PlayerList
                            participants={participants}
                            waitlist={waitlist}
                            onRemovePlayer={handleRemovePlayer}
                            onClearAll={() => setPlayers([])}
                        />
                    </div>

                    {/* Right Panel - Match Result */}
                    <div className="lg:col-span-8">
                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <h2 className="text-lg font-semibold text-white">팀 배정 결과</h2>
                            <div className="flex gap-2">
                                {result && (
                                    <button
                                        onClick={() => setResult(null)}
                                        className="btn-ghost text-sm flex items-center gap-2"
                                    >
                                        <RefreshCcw size={14} />
                                        결과 지우기
                                    </button>
                                )}
                                <button
                                    onClick={handleRunMatching}
                                    disabled={isBalancing || !isReady}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isBalancing ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Shuffle size={16} />
                                    )}
                                    {isReady ? '팀 자동 배정' : `${10 - participants.length}명 더 필요`}
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
                                            <p className="text-slate-500 animate-pulse">최적의 조합을 계산 중...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                                <Shuffle size={24} className="text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 text-center">
                                                {isReady
                                                    ? "'팀 자동 배정' 버튼을 눌러주세요"
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
