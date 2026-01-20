/**
 * 만료 기능이 있는 localStorage 유틸리티
 */

interface StorageItem<T> {
    data: T;
    expiry: number;
}

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

/**
 * 만료 시간과 함께 데이터를 localStorage에 저장
 *
 * @param key - 저장 키
 * @param data - 저장할 데이터
 * @param expiryMs - 만료 시간 (밀리초, 기본값: 24시간)
 */
export const setWithExpiry = <T>(key: string, data: T, expiryMs: number = DEFAULT_EXPIRY_MS): void => {
    const item: StorageItem<T> = {
        data,
        expiry: Date.now() + expiryMs
    };
    localStorage.setItem(key, JSON.stringify(item));
};

/**
 * localStorage에서 데이터를 가져옴 (만료 확인)
 *
 * @param key - 저장 키
 * @returns 데이터 또는 만료/없음 시 null
 */
export const getWithExpiry = <T>(key: string): T | null => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item: StorageItem<T> = JSON.parse(itemStr);

        // 만료 체크
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return item.data;
    } catch {
        // 기존 형식 데이터 호환 (마이그레이션)
        localStorage.removeItem(key);
        return null;
    }
};

/**
 * localStorage에서 항목 삭제
 *
 * @param key - 삭제할 키
 */
export const removeItem = (key: string): void => {
    localStorage.removeItem(key);
};

/**
 * 만료된 모든 항목 정리
 */
export const cleanupExpired = (): void => {
    const keysToCheck = ['owkr_players', 'owkr_result'];

    keysToCheck.forEach(key => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return;

        try {
            const item = JSON.parse(itemStr);
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
            }
        } catch {
            // 파싱 실패 시 삭제
            localStorage.removeItem(key);
        }
    });
};
