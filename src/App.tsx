import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, RefreshCcw, Loader2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, getScore } from './constants';
import { parseLineToPlayer, parseMultipleLines } from './utils/parser';
import { setWithExpiry, getWithExpiry, removeItem, cleanupExpired } from './utils/storage';
import { useBalance } from './hooks/use-balance';
import { useAuth } from './hooks/use-auth';
import { Player, Role, MatchResultData, Tier } from './types';
import PlayerForm from './components/player/form';
import PlayerList from './components/player/list';
import MatchResult from './components/match/result';
import LoginScreen from './components/auth/login-screen';
import LoadingScreen from './components/common/loading-screen';

const STORAGE_KEYS = {
    PLAYERS: 'owkr_players',
    RESULT: 'owkr_result'
};

const App = () => {
    const { user, isLoading } = useAuth();

    const [players, setPlayers] = useState<Player[]>(() => {
        return getWithExpiry<Player[]>(STORAGE_KEYS.PLAYERS) || [];
    });

    const { balanceTeams, result, setResult, isBalancing } = useBalance();

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
        tTier: 'DIAMOND', tDiv: '3', tPref: false,
        dTier: 'DIAMOND', dDiv: '3', dPref: false,
        sTier: 'PLATINUM', sDiv: '3', sPref: false
    });
    const [pasteText, setPasteText] = useState('');
    const [failedParses, setFailedParses] = useState<string[]>([]);
    const [swapSource, setSwapSource] = useState<{ teamIdx: number, role: Role, index: number } | null>(null);

    const addPlayer = () => {
        if (!inputs.name.trim()) return;
        const tTier = inputs.tTier as Tier;
        const dTier = inputs.dTier as Tier;
        const sTier = inputs.sTier as Tier;
        const newPlayer: Player = {
            id: Date.now(),
            name: inputs.name,
            tank: { tier: tTier, div: inputs.tDiv, score: getScore(TIERS.indexOf(tTier), inputs.tDiv), isPreferred: inputs.tPref },
            dps: { tier: dTier, div: inputs.dDiv, score: getScore(TIERS.indexOf(dTier), inputs.dDiv), isPreferred: inputs.dPref },
            sup: { tier: sTier, div: inputs.sDiv, score: getScore(TIERS.indexOf(sTier), inputs.sDiv), isPreferred: inputs.sPref },
        };
        setPlayers(prev => [...prev, newPlayer]);
        setInputs(prev => ({ ...prev, name: '', tPref: false, dPref: false, sPref: false }));
    };

    const handlePaste = () => {
        const { players: parsedPlayers, failedLines } = parseMultipleLines(pasteText);
        if (parsedPlayers.length > 0) {
            setPlayers(prev => [...prev, ...parsedPlayers]);
        }
        if (failedLines.length > 0) {
            setFailedParses(prev => [...prev, ...failedLines]);
        }
        setPasteText('');
    };

    const handleRunMatching = () => {
        setResult(null);
        balanceTeams(players.slice(0, 10));
    };

    const handleSlotClick = (teamIdx: number, role: Role, idx: number) => {
        if (!result) return;
        if (swapSource) {
            if (swapSource.teamIdx === teamIdx && swapSource.role === role && swapSource.index === idx) {
                setSwapSource(null);
                return;
            }
            const newResult = JSON.parse(JSON.stringify(result)) as MatchResultData;
            const teamNames: ('teamA' | 'teamB')[] = ['teamA', 'teamB'];
            const sourceTeam = teamNames[swapSource.teamIdx];
            const targetTeam = teamNames[teamIdx];

            const sourcePlayer = newResult[sourceTeam].assignment[swapSource.role][swapSource.index];
            const targetPlayer = newResult[targetTeam].assignment[role][idx];

            newResult[sourceTeam].assignment[swapSource.role][swapSource.index] = targetPlayer;
            newResult[targetTeam].assignment[role][idx] = sourcePlayer;

            setResult(newResult);
            setSwapSource(null);
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
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-white">매칭 결과</h2>
                            <div className="flex gap-2">
                                {result && (
                                    <button
                                        onClick={() => setResult(null)}
                                        className="btn-ghost text-sm flex items-center gap-2"
                                    >
                                        <RefreshCcw size={14} />
                                        초기화
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
                                    팀 짜기
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
                                            <p className="text-slate-500">
                                                {isReady
                                                    ? "'팀 짜기' 버튼을 눌러주세요"
                                                    : `플레이어 ${10 - participants.length}명 더 필요`
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
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
