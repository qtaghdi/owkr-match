import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

interface DiscordTokenResponse {
    access_token?: string;
}

interface DiscordUser {
    id?: string;
    username?: string;
}

const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

const matchesState = (receivedState: string, savedState: string): boolean => {
    const receivedBuffer = Buffer.from(receivedState);
    const savedBuffer = Buffer.from(savedState);
    return receivedBuffer.length === savedBuffer.length && timingSafeEqual(receivedBuffer, savedBuffer);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
    }

    const { code, state } = req.query;
    const savedState = parse(req.headers.cookie || '').oauth_state;
    const clearStateCookie = serialize('oauth_state', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    res.setHeader('Set-Cookie', clearStateCookie);

    if (typeof code !== 'string') {
        return res.status(400).send('인증 코드가 없습니다.');
    }
    if (typeof state !== 'string' || !savedState || !matchesState(state, savedState)) {
        return res.status(400).send('유효하지 않은 로그인 요청입니다. 다시 시도해주세요.');
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    const host = req.headers.host;
    if (!clientId || !clientSecret || !jwtSecret || !host) {
        return res.status(500).send('Discord 로그인 설정이 올바르지 않습니다.');
    }

    try {
        const forwardedProtocol = req.headers['x-forwarded-proto'];
        const protocol = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || 'http';
        const redirectUri = `${protocol}://${host}/api/auth/callback`;

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            console.error('Discord token request failed:', tokenResponse.status);
            return res.status(502).json({ message: 'Discord 토큰 발급에 실패했습니다.' });
        }

        const tokenData = await tokenResponse.json() as DiscordTokenResponse;
        if (!tokenData.access_token) {
            return res.status(502).json({ message: 'Discord 토큰 응답이 올바르지 않습니다.' });
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userResponse.ok) {
            console.error('Discord user request failed:', userResponse.status);
            return res.status(502).json({ message: 'Discord 사용자 정보를 가져오지 못했습니다.' });
        }

        const userData = await userResponse.json() as DiscordUser;
        if (!userData.id || !userData.username) {
            return res.status(502).json({ message: 'Discord 사용자 응답이 올바르지 않습니다.' });
        }

        const admins = (process.env.ADMIN_USER_IDS || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
        if (!admins.includes(userData.id)) {
            return res.status(403).send(`🚫 관리자가 아닙니다. (ID: ${userData.id})`);
        }

        const token = jwt.sign({ id: userData.id, username: userData.username }, jwtSecret, {
            expiresIn: AUTH_COOKIE_MAX_AGE,
        });
        const authCookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax',
            path: '/',
            maxAge: AUTH_COOKIE_MAX_AGE,
        });

        res.setHeader('Set-Cookie', [clearStateCookie, authCookie]);
        return res.redirect('/');
    } catch (error: unknown) {
        console.error('Discord OAuth callback failed:', error);
        return res.status(500).send('로그인 처리 중 오류가 발생했습니다.');
    }
}
