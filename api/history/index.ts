import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { Redis } from '@upstash/redis';

const MAX_HISTORY_SIZE = 50;

/**
 * @description JWT에서 사용자 ID를 추출한다.
 * @param req - Vercel 요청 객체
 * @returns 사용자 ID 또는 null
 */
const getUserId = (req: VercelRequest): string | null => {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        return decoded.id;
    } catch {
        return null;
    }
};

/**
 * @description Upstash Redis 클라이언트를 생성한다. 환경변수 미설정 시 null 반환.
 * @returns Redis 인스턴스 또는 null
 */
const getRedis = (): Redis | null => {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
};

interface HistoryPlayer {
    name: string;
    tank: { tier: string; div: number | string; score: number; isPreferred: boolean };
    dps: { tier: string; div: number | string; score: number; isPreferred: boolean };
    sup: { tier: string; div: number | string; score: number; isPreferred: boolean };
    noMic?: boolean;
}

interface HistoryData {
    players: HistoryPlayer[];
    updatedAt: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const redis = getRedis();
    if (!redis) {
        return res.status(503).json({ error: 'Redis가 설정되지 않았습니다.' });
    }

    const key = `history:${userId}`;

    if (req.method === 'GET') {
        const data = await redis.get<HistoryData>(key);
        return res.status(200).json(data || { players: [], updatedAt: 0 });
    }

    if (req.method === 'POST') {
        const { players } = req.body as { players: HistoryPlayer[] };
        if (!Array.isArray(players)) {
            return res.status(400).json({ error: 'players 배열이 필요합니다.' });
        }

        const existing = await redis.get<HistoryData>(key);
        const existingPlayers = existing?.players || [];

        const merged = new Map<string, HistoryPlayer>();
        for (const p of existingPlayers) merged.set(p.name, p);
        for (const p of players) merged.set(p.name, p);

        const trimmed = Array.from(merged.values()).slice(-MAX_HISTORY_SIZE);

        const data: HistoryData = { players: trimmed, updatedAt: Date.now() };
        await redis.set(key, data);

        return res.status(200).json(data);
    }

    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
}
