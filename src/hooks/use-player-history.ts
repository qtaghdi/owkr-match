import { useState, useCallback } from 'react';
import { Player } from '../types';

interface HistoryPlayer {
    name: string;
    tank: Player['tank'];
    dps: Player['dps'];
    sup: Player['sup'];
    noMic?: boolean;
}

interface HistoryData {
    players: HistoryPlayer[];
    updatedAt: number;
}

/**
 * @description 서버 기반 플레이어 히스토리를 관리하는 훅. Upstash Redis에 저장/조회한다.
 * @returns 히스토리 목록, 조회/저장 함수, 로딩/에러 상태
 */
export const usePlayerHistory = () => {
    const [history, setHistory] = useState<HistoryPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/history');
            if (!res.ok) {
                if (res.status === 503) {
                    setError('히스토리 서비스가 설정되지 않았습니다.');
                    return;
                }
                throw new Error('조회 실패');
            }
            const data: HistoryData = await res.json();
            setHistory(data.players);
        } catch {
            setError('히스토리를 불러올 수 없습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveHistory = useCallback(async (players: Player[]) => {
        try {
            const payload: HistoryPlayer[] = players.map(p => ({
                name: p.name,
                tank: p.tank,
                dps: p.dps,
                sup: p.sup,
                noMic: p.noMic
            }));

            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ players: payload })
            });
        } catch {
            // 히스토리 저장 실패는 무시 (핵심 기능이 아님)
        }
    }, []);

    return { history, isLoading, error, fetchHistory, saveHistory };
};
