import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OnboardingGuide } from './onboarding-guide';

describe('OnboardingGuide', () => {
    it('입력 가이드를 5단계 투어로 시작한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide
                variant="start"
                onDismiss={() => undefined}
                onUseExample={() => undefined}
            />,
        );

        expect(markup).toContain('입력 가이드 · 1/5');
        expect(markup).toContain('채팅 명단을 한 번에 가져오세요');
        expect(markup).toContain('채팅 붙여넣기 열기');
        expect(markup).toContain('다음');
        expect(markup).toContain('이전');
    });

    it('결과 활용 가이드를 5단계 투어로 시작한다', () => {
        const markup = renderToStaticMarkup(
            <OnboardingGuide variant="result" onDismiss={() => undefined} />,
        );

        expect(markup).toContain('결과 활용 가이드 · 1/5');
        expect(markup).toContain('전체 밸런스를 먼저 확인하세요');
        expect(markup).toContain('총점 차이');
        expect(markup).not.toContain('예시 명단 채우기');
    });
});
