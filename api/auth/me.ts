import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const { verify } = jwt;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ loggedIn: false });
    }

    try {
        const decoded = verify(token, process.env.JWT_SECRET!);
        return res.status(200).json({ loggedIn: true, user: decoded });
    } catch (err) {
        return res.status(401).json({ loggedIn: false });
    }
}