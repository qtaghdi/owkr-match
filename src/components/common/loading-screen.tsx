import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
    return (
        <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-slate-400 text-sm animate-pulse">인증 정보를 확인 중입니다...</p>
            </div>
        </div>
    );
};

export default LoadingScreen;