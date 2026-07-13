import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const host = req.headers.host;
    if (!clientId || !host) {
        return res.status(500).json({ message: 'Discord 로그인 설정이 올바르지 않습니다.' });
    }

    const forwardedProtocol = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/callback`;
    const state = randomBytes(32).toString('hex');

    res.setHeader('Set-Cookie', serialize('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60,
    }));

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify',
        state,
    });

    return res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
