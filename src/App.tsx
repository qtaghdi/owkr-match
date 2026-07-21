import { useState, useEffect, useRef } from 'react';
import { Shuffle, RefreshCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { TIERS, getScore } from './constants';
import { parseMultipleLines } from './utils/parser';
import { recalculateMatchResult } from './utils/balance';
import {
    isMatchResultStale,
    reconcilePlayers,
    syncMatchResultPlayerIdentities,
} from './utils/player';
import { normalizePlayerRolePreferences } from './utils/role-preference';
import { setWithExpiry, getWithExpiry, removeItem, cleanupExpired } from './utils/storage';
import { useBalance } from './hooks/use-balance';
import type { MatchResultData, Player, Role, SwapSource, Tier } from './types';
import type { RosterImportMode } from './utils/player';
import PlayerForm, { type PlayerInputMode } from './components/player/form';
import PlayerList from './components/player/list';
import MatchResult from './components/match/result';

const STORAGE_KEYS = {
    PLAYERS: 'owkr_players',
    RESULT: 'owkr_result',
    PARTICIPANT_MENTIONS: 'owkr_participant_mentions',
};

interface StoredMatchState {
    result: MatchResultData;
    alternatives: MatchResultData[];
}

interface PendingRosterImport {
    incoming: Player[];
    failedLines: string[];
}

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastState {
    type: 'success' | 'error';
    message: string;
    action?: ToastAction;
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
    const [players, setPlayers] = useState<Player[]>(() => {
        const savedPlayers = (getWithExpiry<Player[]>(STORAGE_KEYS.PLAYERS) || [])
            .map(normalizePlayerRolePreferences);
        return reconcilePlayers([], savedPlayers, 'replace').players;
    });
    const [participantMentions, setParticipantMentions] = useState(() => (
        getWithExpiry<string>(STORAGE_KEYS.PARTICIPANT_MENTIONS) || ''
    ));
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
        if (participantMentions.trim()) {
            setWithExpiry(STORAGE_KEYS.PARTICIPANT_MENTIONS, participantMentions);
        } else {
            removeItem(STORAGE_KEYS.PARTICIPANT_MENTIONS);
        }
    }, [participantMentions]);

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
    const [pendingRosterImport, setPendingRosterImport] = useState<PendingRosterImport | null>(null);
    const [inputMode, setInputMode] = useState<PlayerInputMode>('discord');
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [isInputCollapsed, setIsInputCollapsed] = useState(players.length > 0);
    const [inputSummary, setInputSummary] = useState(
        players.length > 0 ? `저장된 참가자 ${players.length}명 불러옴` : '',
    );
    const [swapSource, setSwapSource] = useState<SwapSource | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const dismissToast = () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
        setToast(null);
    };

    const showToast = (
        type: ToastState['type'],
        message: string,
        action?: ToastAction,
    ) => {
        setToast({ type, message, action });
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(
            () => setToast(null),
            action ? 8000 : 2800,
        );
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const hasUnsavedInput = Boolean(
            pasteText.trim()
            || inputs.name.trim()
            || inputs.discordName.trim()
            || pendingRosterImport,
        );
        if (!hasUnsavedInput) return;

        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [inputs.discordName, inputs.name, pasteText, pendingRosterImport]);

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
        const newPlayer = normalizePlayerRolePreferences({
            id: editingPlayerId ?? Date.now(),
            name: inputs.name.trim(),
            discordName: inputs.discordName.trim() || undefined,
            tank: { tier: tTier, div: inputs.tDiv, score: getScore(TIERS.indexOf(tTier), inputs.tDiv), isPreferred: inputs.tPref, isAvoided: inputs.tAvoid },
            dps: { tier: dTier, div: inputs.dDiv, score: getScore(TIERS.indexOf(dTier), inputs.dDiv), isPreferred: inputs.dPref, isAvoided: inputs.dAvoid },
            sup: { tier: sTier, div: inputs.sDiv, score: getScore(TIERS.indexOf(sTier), inputs.sDiv), isPreferred: inputs.sPref, isAvoided: inputs.sAvoid },
            noMic: existingPlayer?.noMic,
        });
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

    const commitRosterImport = (
        incoming: Player[],
        failedLines: string[],
        mode: RosterImportMode,
    ) => {
        const reconciled = reconcilePlayers(players, incoming, mode);
        const waitlistCount = Math.max(reconciled.players.length - 10, 0);
        const hasIssues = failedLines.length > 0 || failedParses.length > 0;
        const syncedResult = result
            ? syncMatchResultPlayerIdentities(result, reconciled.players)
            : null;
        const shouldClearMatchResult = syncedResult
            ? isMatchResultStale(syncedResult, reconciled.players.slice(0, 10))
            : false;

        if (failedLines.length > 0) {
            setFailedParses(previous => [...new Set([...previous, ...failedLines])]);
        }
        setPlayers(reconciled.players);
        setResult(shouldClearMatchResult ? null : syncedResult);
        setAlternatives(shouldClearMatchResult
            ? []
            : alternatives.map(alternative => (
                syncMatchResultPlayerIdentities(alternative, reconciled.players)
            )));
        setSwapSource(null);
        setPendingRosterImport(null);
        setEditingPlayerId(null);
        setInputs(createDefaultPlayerInputs());

        const summaryParts = mode === 'replace'
            ? [
                `유지 ${reconciled.unchangedCount}명`,
                `갱신 ${reconciled.updatedCount}명`,
                `신규 ${reconciled.addedCount}명`,
                `제외 ${reconciled.removedCount}명`,
            ]
            : [
                `갱신 ${reconciled.updatedCount}명`,
                `신규 ${reconciled.addedCount}명`,
            ];
        setInputSummary(`${mode === 'replace' ? '새 명단 적용' : '기존 명단에 추가'} · ${summaryParts.join(' · ')}`);

        if (hasIssues) {
            setIsInputCollapsed(false);
        } else {
            setIsInputCollapsed(true);
            setPasteText('');
        }

        const waitlistMessage = waitlistCount > 0
            ? ` · ${waitlistCount}명은 대기열`
            : '';
        const failedMessage = failedLines.length > 0
            ? ` · ${failedLines.length}명 직접 확인 필요`
            : '';
        const rematchMessage = shouldClearMatchResult && reconciled.players.length >= 10
            ? ' · 팀을 다시 배정해 주세요'
            : '';
        showToast(
            failedLines.length > 0 ? 'error' : 'success',
            `${mode === 'replace' ? '새 참여 명단을 적용했습니다' : '기존 명단에 추가했습니다'}${waitlistMessage}${failedMessage}${rematchMessage}`,
        );
    };

    const applyPendingRosterImport = (mode: RosterImportMode) => {
        if (!pendingRosterImport) return;
        commitRosterImport(
            pendingRosterImport.incoming,
            pendingRosterImport.failedLines,
            mode,
        );
    };

    const handlePaste = () => {
        if (!pasteText.trim()) {
            showToast('error', '붙여넣을 디스코드 채팅이 없습니다.');
            return;
        }
        const { players: parsedPlayers, failedLines } = parseMultipleLines(pasteText);

        if (parsedPlayers.length === 0) {
            if (failedLines.length > 0) {
                setFailedParses(previous => [...new Set([...previous, ...failedLines])]);
            }
            setIsInputCollapsed(false);
            setPendingRosterImport(null);
            showToast('error', '읽어낸 플레이어가 없습니다. 입력 형식을 확인해 주세요.');
            return;
        }

        if (players.length === 0) {
            commitRosterImport(parsedPlayers, failedLines, 'replace');
            return;
        }

        setPendingRosterImport({ incoming: parsedPlayers, failedLines });
        setIsInputCollapsed(false);
        showToast(
            failedLines.length > 0 ? 'error' : 'success',
            `${parsedPlayers.length}명을 읽었습니다. 명단 변경 내용을 확인해 주세요.`,
        );
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
        const removedIndex = players.findIndex(player => player.id === playerId);
        const removedPlayer = players[removedIndex];
        if (!removedPlayer) return;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setPlayers(prev => prev.filter(p => p.id !== playerId));
        if (removedIndex < 10) {
            setResult(null);
            setAlternatives([]);
            setSwapSource(null);
        }
        if (editingPlayerId === playerId) {
            handleCancelEdit();
        }
        showToast(
            'success',
            `${removedPlayer.discordName ?? removedPlayer.name}을 명단에서 제외했습니다.`,
            {
                label: '실행 취소',
                onClick: () => {
                    setPlayers(current => {
                        if (current.some(player => player.id === removedPlayer.id)) return current;
                        const restored = [...current];
                        restored.splice(Math.min(removedIndex, restored.length), 0, removedPlayer);
                        return restored;
                    });
                    if (removedIndex < 10) {
                        setResult(previousResult);
                        setAlternatives(previousAlternatives);
                        setSwapSource(previousSwapSource);
                    }
                },
            },
        );
    };

    const handleClearAll = () => {
        if (players.length === 0) return;
        const previousPlayers = players;
        const previousInputSummary = inputSummary;
        const previousInputCollapsed = isInputCollapsed;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setPlayers([]);
        setResult(null);
        setAlternatives([]);
        setPendingRosterImport(null);
        setInputSummary('');
        setIsInputCollapsed(false);
        setSwapSource(null);
        handleCancelEdit();
        showToast('success', '전체 참여 명단을 비웠습니다.', {
            label: '실행 취소',
            onClick: () => {
                setPlayers(previousPlayers);
                setInputSummary(previousInputSummary);
                setIsInputCollapsed(previousInputCollapsed);
                setResult(previousResult);
                setAlternatives(previousAlternatives);
                setSwapSource(previousSwapSource);
            },
        });
    };

    const handleClearResult = () => {
        if (!result) return;
        const previousResult = result;
        const previousAlternatives = alternatives;
        const previousSwapSource = swapSource;

        setResult(null);
        setAlternatives([]);
        setSwapSource(null);
        showToast('success', '팀 배정 결과를 지웠습니다.', {
            label: '실행 취소',
            onClick: () => {
                setResult(previousResult);
                setAlternatives(previousAlternatives);
                setSwapSource(previousSwapSource);
            },
        });
    };

    // 참여 명단 (첫 10명)과 대기 명단 (나머지) 분리
    const participants = players.slice(0, 10);
    const waitlist = players.slice(10);
    const isReady = participants.length === 10;
    const isResultStale = result ? isMatchResultStale(result, participants) : false;
    const rosterImportPreview = pendingRosterImport
        ? reconcilePlayers(players, pendingRosterImport.incoming, 'replace')
        : null;

    return (
        <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-surface text-slate-200 font-sans">
            <a
                href="#main-content"
                className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
            >
                본문으로 건너뛰기
            </a>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="mx-auto flex h-16 max-w-[1600px] items-center px-4 md:px-8">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"
                    >
                        OWKR Match
                    </motion.h1>

                </div>
            </header>

            {/* Main Content */}
            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto max-w-[1600px] scroll-mt-20 px-4 py-6 focus:outline-none md:px-8 md:py-8"
            >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(400px,460px)_minmax(0,1fr)] xl:items-start">
                    {/* Left Panel - Player Input */}
                    <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:h-[calc(100dvh-8rem)]">
                        <PlayerForm
                            players={players}
                            participantMentions={participantMentions}
                            setParticipantMentions={setParticipantMentions}
                            inputs={inputs}
                            setInputs={setInputs}
                            addPlayer={addPlayer}
                            pasteText={pasteText}
                            onPasteTextChange={(value) => {
                                setPasteText(value);
                                setPendingRosterImport(null);
                            }}
                            handlePaste={handlePaste}
                            importPreview={rosterImportPreview ? {
                                incomingCount: pendingRosterImport?.incoming.length ?? 0,
                                failedCount: pendingRosterImport?.failedLines.length ?? 0,
                                addedCount: rosterImportPreview.addedCount,
                                updatedCount: rosterImportPreview.updatedCount,
                                unchangedCount: rosterImportPreview.unchangedCount,
                                removedCount: rosterImportPreview.removedCount,
                            } : null}
                            onApplyImport={applyPendingRosterImport}
                            onCancelImport={() => setPendingRosterImport(null)}
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
                            onClearAll={handleClearAll}
                        />
                    </div>

                    {/* Right Panel - Match Result */}
                    <div className="grid min-w-0 content-start gap-6">
                        {/* Action Bar */}
                        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-white">팀 배정 결과</h2>
                            <div className="flex gap-2">
                                {result && (
                                    <button
                                        type="button"
                                        onClick={handleClearResult}
                                        className="btn-ghost text-sm flex items-center gap-2"
                                    >
                                        <RefreshCcw size={14} aria-hidden="true" />
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
                                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                    ) : (
                                        <Shuffle size={16} aria-hidden="true" />
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
                                            <Loader2 size={40} className="animate-spin text-accent" aria-hidden="true" />
                                            <p className="text-slate-500 animate-pulse">최적의 조합을 계산 중…</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                                <Shuffle size={24} className="text-slate-600" aria-hidden="true" />
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
                                        onCancelSwap={() => setSwapSource(null)}
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
                        className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[80] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
                            toast.type === 'error'
                                ? 'border-rose-500/30 bg-rose-950/90 text-rose-100'
                                : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100'
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.type === 'error'
                            ? <AlertCircle size={16} aria-hidden="true" />
                            : <CheckCircle2 size={16} aria-hidden="true" />}
                        <span className="min-w-0 break-words">{toast.message}</span>
                        {toast.action && (
                            <button
                                type="button"
                                onClick={() => {
                                    const action = toast.action;
                                    if (!action) return;
                                    dismissToast();
                                    action.onClick();
                                }}
                                className="ml-2 min-h-8 shrink-0 rounded-md border border-current/30 px-2.5 text-xs font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </MotionConfig>
    );
};

export default App;
