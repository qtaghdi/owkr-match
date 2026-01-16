import React from 'react';

const LoginScreen = () => {
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
                {/* Discord Icon SVG */}
                <svg width="24" height="24" viewBox="0 0 127 96" fill="white" className="group-hover:animate-pulse">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-5.83-47.5-21.48-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                Discord 계정으로 로그인
            </a>
            <p className="text-xs text-slate-600">등록된 관리자만 접근 가능합니다.</p>
        </div>
    );
};

export default LoginScreen;