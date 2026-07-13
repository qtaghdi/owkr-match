import { useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { MatchResultData, Role, SwapSource, TeamResult } from '../../../types';
import { CUSTOM_GAME_CODE } from '../../../constants';
import { useCopyImage } from '../../../hooks/use-copy-image';
import MatchupTable from './matchup-table';
import CopyButton from './copy-button';

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
    alternatives?: MatchResultData[];
    onSelectAlternative?: (idx: number) => void;
    isGeneratingAlternatives?: boolean;
    isStale?: boolean;
}

const getTeamRosterLabel = (team: TeamResult): string => [
    ...team.assignment.TANK,
    ...team.assignment.DPS,
    ...team.assignment.SUPPORT,
].map((player) => player.discordName ?? player.name.split('#')[0]).join(' · ');

const getMatchResultKey = (result: MatchResultData): string => [
    ...result.teamA.assignment.TANK,
    ...result.teamA.assignment.DPS,
    ...result.teamA.assignment.SUPPORT,
    ...result.teamB.assignment.TANK,
    ...result.teamB.assignment.DPS,
    ...result.teamB.assignment.SUPPORT,
].map((player) => player.id).join('-');

const MatchResult = ({
    matchResult,
    onSlotClick,
    swapSource,
    alternatives = [],
    onSelectAlternative,
    isGeneratingAlternatives = false,
    isStale = false,
}: MatchResultProps) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const { copyStatus, handleCopyImage } = useCopyImage(captureRef);

    return (
        <div className="space-y-4">
            {isStale && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200" role="status">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold">참가자 정보가 변경되었습니다.</p>
                        <p className="mt-0.5 text-xs text-amber-300/80">다시 매칭해 주세요.</p>
                    </div>
                </div>
            )}

            <div
                className={`space-y-4 transition-opacity duration-200 ${isStale ? 'opacity-40' : 'opacity-100'}`}
                aria-disabled={isStale}
                inert={isStale}
            >
                {/* 이미지 캡처 영역 */}
                <div ref={captureRef} className="bg-[#0b0c10] p-5 rounded-xl">
                    <div data-exclude-export className="flex items-center justify-center gap-2 mb-4 pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-500">커스텀 코드</span>
                        <span className="text-sm font-bold tracking-widest text-slate-200">{CUSTOM_GAME_CODE}</span>
                    </div>
                    <MatchupTable
                        matchResult={matchResult}
                        onSlotClick={onSlotClick}
                        swapSource={swapSource}
                    />
                </div>

                {/* 다른 조합 (캡처 제외) */}
                {alternatives.length > 0 ? (
                    <div className="space-y-2 px-1">
                        <div className="text-sm text-slate-500">다른 팀 조합</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {alternatives.map((alternative, idx) => {
                                const teamARoster = getTeamRosterLabel(alternative.teamA);
                                const teamBRoster = getTeamRosterLabel(alternative.teamB);

                                return (
                                    <button
                                        type="button"
                                        key={getMatchResultKey(alternative)}
                                        onClick={() => onSelectAlternative?.(idx)}
                                        aria-label={`조합 ${idx + 2} 선택. 1팀 ${teamARoster}. 2팀 ${teamBRoster}`}
                                        className="min-w-0 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-left transition-colors hover:border-slate-600 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                                    >
                                        <div className="mb-1.5 text-xs font-medium text-slate-300">조합 {idx + 2}</div>
                                        <p className="truncate text-[11px] text-slate-400" title={`1팀 · ${teamARoster}`}>
                                            <span className="text-blue-400">1팀</span> · {teamARoster}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={`2팀 · ${teamBRoster}`}>
                                            <span className="text-red-400">2팀</span> · {teamBRoster}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : isGeneratingAlternatives ? (
                    <div className="flex items-center gap-2 px-1 text-sm text-slate-500" role="status">
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        다른 팀 조합 계산 중…
                    </div>
                ) : null}

                {/* 하단 컨트롤 (캡처 제외) */}
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 px-1">
                    <div>플레이어 두 명을 차례로 누르면 자리를 바꿀 수 있습니다</div>
                    <CopyButton status={copyStatus} onClick={handleCopyImage} />
                </div>
            </div>
        </div>
    );
};

export default MatchResult;
