import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchResultData, Player } from '../types';
import type { BalanceWorkerResponse } from '../utils/balance';

/**
 * @description 밸런싱 워커의 생명주기와 결과 상태를 React에 연결한다.
 */
export const useBalance = () => {
    const [isBalancing, setIsBalancing] = useState(false);
    const [result, setResult] = useState<MatchResultData | null>(null);
    const [alternatives, setAlternatives] = useState<MatchResultData[]>([]);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => () => workerRef.current?.terminate(), []);

    const balanceTeams = useCallback((players: Player[]): Promise<void> => {
        if (players.length !== 10) {
            return Promise.reject(new Error(`플레이어가 10명이어야 합니다. (현재: ${players.length}명)`));
        }

        workerRef.current?.terminate();
        setIsBalancing(true);

        return new Promise((resolve, reject) => {
            let worker: Worker;

            try {
                worker = new Worker(new URL('../workers/balance.worker.ts', import.meta.url), { type: 'module' });
            } catch (error) {
                setIsBalancing(false);
                reject(error);
                return;
            }

            workerRef.current = worker;

            const finish = (): void => {
                worker.terminate();
                if (workerRef.current === worker) workerRef.current = null;
                setIsBalancing(false);
            };

            worker.onmessage = (event: MessageEvent<BalanceWorkerResponse>) => {
                finish();

                if (!event.data.ok) {
                    reject(new Error(event.data.error));
                    return;
                }

                setResult(event.data.data.result);
                setAlternatives(event.data.data.alternatives);
                resolve();
            };

            worker.onerror = () => {
                finish();
                reject(new Error('밸런싱 워커를 실행하지 못했습니다.'));
            };

            worker.postMessage(players);
        });
    }, []);

    return { balanceTeams, result, setResult, alternatives, setAlternatives, isBalancing };
};
