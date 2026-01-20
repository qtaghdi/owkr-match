import React from 'react';
import { Camera, Check, AlertCircle } from 'lucide-react';

type CopyStatus = 'idle' | 'loading' | 'success' | 'error';

interface CopyButtonProps {
    status: CopyStatus;
    onClick: () => void;
}

const CopyButton = ({ status, onClick }: CopyButtonProps) => {
    return (
        <button
            onClick={onClick}
            disabled={status === 'loading'}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-xs
                ${status === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : status === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'}
            `}
        >
            {status === 'loading' && <span className="animate-spin">⏳</span>}
            {status === 'success' && <Check size={14} />}
            {status === 'error' && <AlertCircle size={14} />}
            {status === 'idle' && <Camera size={14} />}

            {status === 'loading' ? '캡처 중...' :
                status === 'success' ? '복사 완료!' :
                    status === 'error' ? '실패' : '이미지로 복사'}
        </button>
    );
};

export default CopyButton;
