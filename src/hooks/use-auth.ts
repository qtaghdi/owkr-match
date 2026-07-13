import { useEffect, useState } from 'react';

export interface User {
    username: string;
    id: string;
}

interface AuthResponse {
    loggedIn: boolean;
    user?: User;
}

/**
 * @description 현재 Discord 로그인 사용자를 조회하고 요청 생명주기를 관리한다.
 */
export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadUser = async (): Promise<void> => {
            try {
                const response = await fetch('/api/auth/me', { signal: controller.signal });
                if (!response.ok) throw new Error('Unauthorized');

                const data = await response.json() as AuthResponse;
                setUser(data.loggedIn && data.user ? data.user : null);
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) setUser(null);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        void loadUser();
        return () => controller.abort();
    }, []);

    return { user, isLoading };
};
