import { useState, useCallback, RefObject } from 'react';

type CopyStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * @description html2canvas를 이용해 요소를 이미지로 캡처하고 클립보드에 복사하는 훅.
 * @param ref - 캡처할 요소의 ref
 * @returns copyStatus, handleCopyImage
 */
export const useCopyImage = (ref: RefObject<HTMLDivElement | null>) => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

    const handleCopyImage = useCallback(async () => {
        if (!ref.current) return;
        setCopyStatus('loading');

        try {
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(ref.current, {
                backgroundColor: '#0b0c10',
                useCORS: true,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setCopyStatus('error');
                    return;
                }
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    setCopyStatus('success');
                    setTimeout(() => setCopyStatus('idle'), 2000);
                } catch (err) {
                    console.error(err);
                    setCopyStatus('error');
                }
            });
        } catch (error) {
            console.error(error);
            setCopyStatus('error');
        }
    }, [ref]);

    return { copyStatus, handleCopyImage };
};
