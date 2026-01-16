import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
const { sign } = jwt;
import { serialize } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).send('코드가 없습니다.');
    }

    try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const REDIRECT_URI = `${protocol}://${host}/api/auth/callback`;

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Discord API Error:', errorData);
            return res.status(500).json({ message: '토큰 발급 실패', details: errorData });
        }

        const tokenData = await tokenResponse.json();

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userResponse.ok) {
            const errorData = await userResponse.json();
            return res.status(500).json(errorData);
        }

        const userData = await userResponse.json();

        const admins = (process.env.ADMIN_USER_IDS || '').split(',');
        if (!admins.includes(userData.id)) {
            return res.status(403).send(`🚫 관리자가 아닙니다. (ID: ${userData.id})`);
        }

        const token = sign({ id: userData.id, username: userData.username }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        });

        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax',
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        res.redirect('/');

    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    }
}