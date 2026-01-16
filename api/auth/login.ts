import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const REDIRECT_URI = `${protocol}://${host}/api/auth/callback`;

    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify',
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}