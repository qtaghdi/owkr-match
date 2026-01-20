import { useState, useCallback, RefObject } from 'react';
import { toPng } from 'html-to-image';

type CopyStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * @description html-to-image를 이용해 요소를 이미지로 캡처하고 클립보드에 복사하는 훅.
 * @param ref - 캡처할 요소의 ref
 * @returns copyStatus, handleCopyImage
 */
export const useCopyImage = (ref: RefObject<HTMLDivElement | null>) => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

    const handleCopyImage = useCallback(async () => {
        if (!ref.current) return;
        setCopyStatus('loading');

        try {
            const dataUrl = await toPng(ref.current, {
                backgroundColor: '#0b0c10',
                pixelRatio: 2,
                cacheBust: true,
            });

            const response = await fetch(dataUrl);
            const blob = await response.blob();

            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);

            setCopyStatus('success');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (error) {
            console.error(error);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    }, [ref]);

    return { copyStatus, handleCopyImage };
};
