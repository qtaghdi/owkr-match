import React, { useState, useEffect } from 'react';
import { Shuffle, RefreshCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, getScore } from './constants';
import { parseLineToPlayer } from './utils/parser';
import { useBalance } from './hooks/use-balance';
import { Player, Role, MatchResultData } from './types';
import PlayerForm from './components/player/form';
import PlayerList from './components/player/list';
import MatchResult from './components/match/result';

const App = () => {
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [user, setUser] = useState<{ username: string; id: string } | null>(null);

    const [players, setPlayers] = useState<Player[]>([]);
    const { balanceTeams, result, setResult, isBalancing } = useBalance();

    const [inputs, setInputs] = useState({
        name: '',
        tTier: 'DIAMOND', tDiv: '3', tPref: false,
        dTier: 'DIAMOND', dDiv: '3', dPref: false,
        sTier: 'PLATINUM', sDiv: '3', sPref: false
    });
    const [pasteText, setPasteText] = useState('');
    const [swapSource, setSwapSource] = useState<{teamIdx: number, role: Role, index: number} | null>(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('Unauthorized');
            })
            .then((data) => {
                if (data.loggedIn) setUser(data.user);
            })
            .catch(() => setUser(null))
            .finally(() => setIsLoadingAuth(false));
    }, []);

    const addPlayer = () => {
        if (!inputs.name.trim()) return;
        const newPlayer: Player = {
            id: Date.now(),
            name: inputs.name,
            tank: { tier: inputs.tTier, div: inputs.tDiv, score: getScore(TIERS.indexOf(inputs.tTier), inputs.tDiv), isPreferred: inputs.tPref },
            dps: { tier: inputs.dTier, div: inputs.dDiv, score: getScore(TIERS.indexOf(inputs.dTier), inputs.dDiv), isPreferred: inputs.dPref },
            sup: { tier: inputs.sTier, div: inputs.sDiv, score: getScore(TIERS.indexOf(inputs.sTier), inputs.sDiv), isPreferred: inputs.sPref },
        };
        setPlayers(prev => [...prev, newPlayer]);
        setInputs(prev => ({ ...prev, name: '', tPref: false, dPref: false, sPref: false }));
    };

    const handlePaste = () => {
        const lines = pasteText.split(/\r?\n/).filter(line => line.trim());
        const parsedPlayers: Player[] = [];
        lines.forEach(line => {
            const p = parseLineToPlayer(line);
            if (p) parsedPlayers.push(p);
        });
        if (parsedPlayers.length > 0) {
            setPlayers(prev => [...prev, ...parsedPlayers]);
            setPasteText('');
        }
    };

    const handleRunMatching = () => {
        setResult(null);
        balanceTeams(players);
    };

    const handleSlotClick = (teamIdx: number, role: Role, idx: number) => {
        if (!result) return;
        if (swapSource) {
            if (swapSource.teamIdx === teamIdx && swapSource.role === role && swapSource.index === idx) {
                setSwapSource(null); return;
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

    if (isLoadingAuth) {
        return (
            <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                    <p className="text-slate-400 text-sm animate-pulse">인증 정보를 확인 중입니다...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center text-white space-y-8 p-4">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        OWKR Match V2
                    </h1>
                    <p className="text-slate-400">관리자 전용 내전 매칭 서비스</p>
                </div>

                <a
                    href="/api/auth/login"
                    className="group px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-bold text-white transition-all shadow-lg shadow-[#5865F2]/30 flex items-center gap-3 transform hover:scale-105"
                >
                    <svg width="24" height="24" viewBox="0 0 127 96" fill="white" className="group-hover:animate-pulse">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-5.83-47.5-21.48-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                    </svg>
                    Discord 계정으로 로그인
                </a>
                <p className="text-xs text-slate-600">등록된 관리자만 접근 가능합니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0c10] text-[#e6e9ef] font-sans p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8 relative">
                <div className="absolute top-0 right-0 flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    관리자: {user.username}
                </div>

                <header className="text-center space-y-2 pt-6 md:pt-0">
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        OWKR Match V2
                    </motion.h1>
                    <p className="text-slate-400 text-sm">티어 뒤에 '!'를 붙이면 포지션 고정</p>
                </header>

                <div className="grid lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-6">
                        <PlayerForm
                            inputs={inputs} setInputs={setInputs} addPlayer={addPlayer}
                            pasteText={pasteText} setPasteText={setPasteText} handlePaste={handlePaste}
                        />
                        <PlayerList players={players} setPlayers={setPlayers} />
                    </div>

                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">매칭 결과</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setResult(null)} className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-2">
                                    <RefreshCcw size={16}/> 초기화
                                </button>
                                <button
                                    onClick={handleRunMatching}
                                    disabled={isBalancing}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded shadow-lg shadow-blue-900/50 flex items-center gap-2 transform active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    {isBalancing ? <Loader2 size={18} className="animate-spin"/> : <Shuffle size={18}/>}
                                    팀 짜기
                                </button>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {!result ? (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                                    {isBalancing ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 size={48} className="text-blue-500 animate-spin mb-4"/>
                                            <p className="animate-pulse">최적의 조합을 계산 중입니다...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Shuffle size={48} className="mb-4 opacity-20"/>
                                            <p>플레이어 10명을 채우고 '팀 짜기'를 눌러주세요.</p>
                                        </>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                                    <MatchResult matchResult={result} onSlotClick={handleSlotClick} swapSource={swapSource} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;