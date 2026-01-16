import { useState, useEffect } from 'react';

export interface User {
    username: string;
    id: string;
}

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('Unauthorized');
            })
            .then((data) => {
                if (data.loggedIn) setUser(data.user);
            })
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    return { user, isLoading };
};