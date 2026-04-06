import React, { useRef } from 'react';
import { MatchResultData, Role } from '../../../types';
import { CUSTOM_GAME_CODE } from '../../../constants';
import { useCopyImage } from '../../../hooks/use-copy-image';
import { SwapSource } from './team-card';
import MatchupTable from './matchup-table';
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
            {/* 이미지 캡처 영역 */}
            <div ref={captureRef} className="bg-[#0b0c10] p-4 rounded-xl">
                <div data-exclude-export className="flex items-center justify-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500">커스텀 코드</span>
                    <span className="text-sm font-bold tracking-widest text-slate-200">{CUSTOM_GAME_CODE}</span>
                </div>
                <MatchupTable
                    matchResult={matchResult}
                    onSlotClick={onSlotClick}
                    swapSource={swapSource}
                />
            </div>

            {/* 밸런스 지표 (캡처 제외) */}
            {metrics && (
                <div className="px-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center bg-slate-800/30 rounded-xl p-3">
                        <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">총점 차이</div>
                            <div className="text-sm font-semibold text-slate-300">{metrics.totalDiff.toLocaleString()}점</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">탱크 매치업</div>
                            <div className="text-sm font-semibold text-slate-300">{metrics.roleDiffs.tank.toLocaleString()}점</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">딜러 매치업</div>
                            <div className="text-sm font-semibold text-slate-300">{metrics.roleDiffs.dps.toLocaleString()}점</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">힐러 매치업</div>
                            <div className="text-sm font-semibold text-slate-300">{metrics.roleDiffs.support.toLocaleString()}점</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 다른 조합 (캡처 제외) */}
            {alternatives.length > 0 && (
                <div className="space-y-2 px-1">
                    <div className="text-xs text-slate-500">* 다른 조합</div>
                    <div className="flex gap-2">
                        {alternatives.map((alt, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSelectAlternative?.(idx)}
                                className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2 text-left transition-colors"
                            >
                                <div className="text-xs text-slate-400 mb-1">조합 {idx + 2}</div>
                                <div className="text-xs text-slate-300">차이 {alt.diff.toLocaleString()}점</div>
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

            {/* 하단 컨트롤 (캡처 제외) */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <div>* 플레이어를 클릭하여 스왑</div>
                <CopyButton status={copyStatus} onClick={handleCopyImage} />
            </div>
        </div>
    );
};

export default MatchResult;
