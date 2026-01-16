import React, { useRef, useState } from 'react';
import { Camera, Check, AlertCircle } from 'lucide-react';

import { MatchResultData, Role } from 'src/types';
import TeamCard, { SwapSource } from './team-card';

interface MatchResultProps {
    matchResult: MatchResultData;
    onSlotClick: (teamIdx: number, role: Role, idx: number) => void;
    swapSource: SwapSource | null;
}

const MatchResult = ({ matchResult, onSlotClick, swapSource }: MatchResultProps) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleCopyImage = async () => {
        if (!captureRef.current) return;
        setCopyStatus('loading');

        try {
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(captureRef.current, {
                background: '#0b0c10',
                useCORS: true,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setCopyStatus('error');
                    return;
                }
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    setCopyStatus('success');
                    setTimeout(() => setCopyStatus('idle'), 2000);
                } catch (err) {
                    console.error(err);
                    setCopyStatus('error');
                }
            });
        } catch (error) {
            console.error(error);
            setCopyStatus('error');
        }
    };

    return (
        <div className="space-y-4">
            <div ref={captureRef} className="bg-[#0b0c10] p-4 rounded-xl">
                <div className="grid md:grid-cols-2 gap-6 relative">
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
                <button
                    onClick={handleCopyImage}
                    disabled={copyStatus === 'loading'}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-xs
                        ${copyStatus === 'success'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : copyStatus === 'error'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'}
                    `}
                >
                    {copyStatus === 'loading' && <span className="animate-spin">⏳</span>}
                    {copyStatus === 'success' && <Check size={14} />}
                    {copyStatus === 'error' && <AlertCircle size={14} />}
                    {copyStatus === 'idle' && <Camera size={14} />}

                    {copyStatus === 'loading' ? '캡처 중...' :
                        copyStatus === 'success' ? '복사 완료!' :
                            copyStatus === 'error' ? '실패' : '이미지로 복사'}
                </button>
            </div>
        </div>
    );
};

export default MatchResult;