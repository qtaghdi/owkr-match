import React, { useState } from 'react';
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

    return (
        <div className="min-h-screen bg-[#0b0c10] text-[#e6e9ef] font-sans p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="text-center space-y-2">
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        OW2 내전 팀 매칭 V2
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