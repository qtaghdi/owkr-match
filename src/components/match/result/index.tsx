import React, { useRef } from 'react';
import { MatchResultData, Role } from '../../../types';
import { useCopyImage } from '../../../hooks/use-copy-image';
import TeamCard, { SwapSource } from './team-card';
import CopyButton from './copy-button';

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
}

const MatchResult = ({ matchResult, onSlotClick, swapSource }: MatchResultProps) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const { copyStatus, handleCopyImage } = useCopyImage(captureRef);

    return (
        <div className="space-y-4">
            <div ref={captureRef} className="bg-[#0b0c10] p-4 rounded-xl overflow-visible">
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
            </div>

            <div className="text-center text-xs text-slate-500 mt-2">
                * 평균 점수 차이: {Math.abs(matchResult.diff).toLocaleString()}점
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 mt-4">
                <div>* 플레이어를 클릭하여 스왑</div>
                <CopyButton status={copyStatus} onClick={handleCopyImage} />
            </div>
        </div>
    );
};

export default MatchResult;
