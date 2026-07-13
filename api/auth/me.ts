import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ loggedIn: false });
    }

    const { verify } = jwt;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ loggedIn: false });
    }

    try {
        const decoded = verify(token, jwtSecret);
        return res.status(200).json({ loggedIn: true, user: decoded });
    } catch {
        return res.status(401).json({ loggedIn: false });
    }
}
