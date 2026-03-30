import React, { useRef } from 'react';
import { MatchResultData, Role } from '../../../types';
import { CUSTOM_GAME_CODE } from '../../../constants';
import { useCopyImage } from '../../../hooks/use-copy-image';
import TeamCard, { SwapSource } from './team-card';
import CopyButton from './copy-button';

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
    alternatives?: MatchResultData[];
    onSelectAlternative?: (idx: number) => void;
}

const MatchResult = ({ matchResult, onSlotClick, swapSource, alternatives = [], onSelectAlternative }: MatchResultProps) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const { copyStatus, handleCopyImage } = useCopyImage(captureRef);
    const metrics = matchResult.metrics;

    return (
        <div className="space-y-4">
            <div ref={captureRef} className="bg-[#0b0c10] p-4 rounded-xl overflow-visible">
                <div className="flex items-center justify-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500">커스텀 코드</span>
                    <span className="text-sm font-bold tracking-widest text-slate-200">{CUSTOM_GAME_CODE}</span>
                </div>
                <div className="flex flex-col md:flex-row gap-6 relative overflow-visible">
                    <TeamCard
                        title="TEAM 1"
                        teamData={matchResult.teamA}
                        teamIdx={0}
                        color="blue"
                        onSlotClick={onSlotClick}
                        swapSource={swapSource}
                    />

                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b0c10] border border-slate-700 rounded-full items-center justify-center z-10 font-bold text-xs text-slate-500">
                        VS
                    </div>

                    <TeamCard
                        title="TEAM 2"
                        teamData={matchResult.teamB}
                        teamIdx={1}
                        color="red"
                        onSlotClick={onSlotClick}
                        swapSource={swapSource}
                    />
                </div>

                {metrics && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            <div>
                                <div className="text-[10px] text-slate-500 mb-0.5">총점 차이</div>
                                <div className="text-sm font-semibold text-slate-300">
                                    {metrics.totalDiff.toLocaleString()}점
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 mb-0.5">탱크 매치업</div>
                                <div className="text-sm font-semibold text-slate-300">
                                    {metrics.roleDiffs.tank.toLocaleString()}점
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 mb-0.5">딜러 매치업</div>
                                <div className="text-sm font-semibold text-slate-300">
                                    {metrics.roleDiffs.dps.toLocaleString()}점
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 mb-0.5">힐러 매치업</div>
                                <div className="text-sm font-semibold text-slate-300">
                                    {metrics.roleDiffs.support.toLocaleString()}점
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {alternatives.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs text-slate-500 px-1">* 다른 조합</div>
                    <div className="flex gap-2">
                        {alternatives.map((alt, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSelectAlternative?.(idx)}
                                className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2 text-left transition-colors"
                            >
                                <div className="text-xs text-slate-400 mb-1">조합 {idx + 2}</div>
                                <div className="text-xs text-slate-300">
                                    차이 {alt.diff.toLocaleString()}점
                                </div>
                                {alt.metrics && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        탱 {alt.metrics.roleDiffs.tank} / 딜 {alt.metrics.roleDiffs.dps} / 힐 {alt.metrics.roleDiffs.support}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 mt-4">
                <div>* 플레이어를 클릭하여 스왑</div>
                <CopyButton status={copyStatus} onClick={handleCopyImage} />
            </div>
        </div>
    );
};

export default MatchResult;
