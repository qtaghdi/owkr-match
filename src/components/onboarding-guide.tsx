import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftRight,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Copy,
    Layers3,
    ListChecks,
    MessageSquareText,
    Shuffle,
    User,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type GuideVariant = 'start' | 'result';
type GuideInputMode = 'discord' | 'manual' | 'mentions';

interface OnboardingGuideProps {
    onDismiss: () => void;
    onSelectInputMode?: (mode: GuideInputMode) => void;
    onUseExample?: () => void;
    variant: GuideVariant;
}

interface GuideStep {
    action?: GuideInputMode | 'example';
    actionLabel?: string;
    description: string;
    fallback?: string;
    icon: LucideIcon;
    target: string;
    title: string;
}

const START_GUIDE_STEPS: readonly GuideStep[] = [
    {
        icon: MessageSquareText,
        target: '#discord-input-tab',
        title: '채팅 명단을 한 번에 가져오세요',
        description: '디스코드에서 배틀태그와 역할별 티어가 적힌 채팅을 복사해 여러 참가자를 한 번에 추가합니다.',
        action: 'discord',
        actionLabel: '채팅 붙여넣기 열기',
    },
    {
        icon: User,
        target: '#manual-input-tab',
        title: '한 명씩 직접 입력할 수도 있어요',
        description: '배틀태그와 탱커·딜러·힐러 티어를 입력하고 선호, 비선호, 마이크 미사용 상태를 선택합니다.',
        action: 'manual',
        actionLabel: '수동 입력 열기',
    },
    {
        icon: ListChecks,
        target: '#participant-check-tab',
        title: '참여 대조로 빠진 인원을 찾으세요',
        description: '공지의 디스코드 멘션을 붙여넣으면 현재 명단과 비교해 입력 완료 인원과 아직 입력하지 않은 사람을 구분합니다.',
        action: 'mentions',
        actionLabel: '참여 대조 열기',
    },
    {
        icon: Users,
        target: '#player-management',
        title: '참가자 10명을 확인하세요',
        description: '먼저 입력된 10명이 참가자가 되고, 이후 인원은 대기열에 들어가 참가자 삭제 시 자동 승격됩니다.',
        action: 'example',
        actionLabel: '더미 참가자 10명 추가',
    },
    {
        icon: Shuffle,
        target: '#matching-action',
        title: '팀 자동 배정을 실행하세요',
        description: '10명이 채워지면 역할 선호, 티어 차이, 마이크 인원을 함께 고려해 여러 팀 조합을 계산합니다.',
    },
] as const;

const RESULT_GUIDE_STEPS: readonly GuideStep[] = [
    {
        icon: BarChart3,
        target: '#balance-summary',
        title: '전체 밸런스를 먼저 확인하세요',
        description: '총점 차이와 탱커·딜러·힐러의 맞대결 차이를 보고 어느 팀이 얼마나 앞서는지 확인합니다.',
    },
    {
        icon: ListChecks,
        target: '#balance-exceptions',
        title: '배정 예외를 확인하세요',
        description: '선호 역할 이탈, 비선호 배정, 미배치 역할 인원이 있다면 실제 플레이가 가능한 구성인지 확인합니다.',
    },
    {
        icon: Layers3,
        target: '#alternative-results',
        fallback: '#match-result',
        title: '다른 팀 조합도 비교하세요',
        description: '현재 조합이 애매하다면 다른 조합을 눌러 참가자 구성과 총점 차이를 바로 비교할 수 있습니다.',
    },
    {
        icon: ArrowLeftRight,
        target: '#swap-guide',
        title: '필요한 자리만 직접 바꾸세요',
        description: '결과표에서 두 플레이어를 차례로 선택하면 팀이나 역할을 교체하고 점수를 다시 계산합니다.',
    },
    {
        icon: Copy,
        target: '#result-share-controls',
        fallback: '#match-result',
        title: '완성된 결과를 공유하세요',
        description: '전체 티어 표시를 켜서 세부 정보를 확인하고, 이미지 복사 버튼으로 디스코드에 공유할 수 있습니다.',
    },
] as const;

/**
 * @description 현재 작업 단계의 실제 화면 영역을 강조하며 입력 또는 결과 활용법을 한 단계씩 안내한다.
 */
export const OnboardingGuide = ({
    onDismiss,
    onSelectInputMode,
    onUseExample,
    variant,
}: OnboardingGuideProps) => {
    const panelRef = useRef<HTMLElement>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const steps = variant === 'result' ? RESULT_GUIDE_STEPS : START_GUIDE_STEPS;
    const step = steps[stepIndex];
    const isFirstStep = stepIndex === 0;
    const isLastStep = stepIndex === steps.length - 1;

    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onDismiss();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onDismiss]);

    useEffect(() => {
        const preferredTarget = document.querySelector<HTMLElement>(step.target);
        const fallbackTarget = step.fallback
            ? document.querySelector<HTMLElement>(step.fallback)
            : null;
        const target = preferredTarget && preferredTarget.offsetHeight > 0
            ? preferredTarget
            : fallbackTarget ?? preferredTarget;
        if (!target) return;

        target.setAttribute('data-guide-highlight', 'true');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const frameId = window.requestAnimationFrame(() => {
            target.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'center',
            });
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            target.removeAttribute('data-guide-highlight');
        };
    }, [step]);

    const Icon = step.icon;
    const handleStepAction = step.action === 'example'
        ? onUseExample
        : step.action
            ? () => onSelectInputMode?.(step.action as GuideInputMode)
            : undefined;

    return (
        <motion.aside
            ref={panelRef}
            id="onboarding-guide"
            role="dialog"
            aria-modal="false"
            aria-labelledby="onboarding-guide-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[90] mx-auto max-h-[min(70dvh,32rem)] max-w-xl overflow-y-auto rounded-2xl border border-cyan-400/30 bg-slate-950/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl focus:outline-none sm:p-5"
        >
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                    <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1" aria-live="polite">
                    <p className="text-xs font-semibold text-cyan-300">
                        {variant === 'result' ? '결과 활용 가이드' : '입력 가이드'} · {stepIndex + 1}/{steps.length}
                    </p>
                    <h2 id="onboarding-guide-title" className="mt-1 text-base font-bold text-white sm:text-lg">
                        {step.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                        {step.description}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                    aria-label="사용 가이드 닫기"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {steps.map(({ title }, index) => (
                    <span
                        key={title}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                            index <= stepIndex ? 'bg-cyan-400' : 'bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                    {step.actionLabel && handleStepAction ? (
                        <button
                            type="button"
                            onClick={handleStepAction}
                            className="min-h-9 rounded-md px-2.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                        >
                            {step.actionLabel}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="min-h-9 rounded-md px-2.5 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                        >
                            건너뛰기
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStepIndex(current => current - 1)}
                        disabled={isFirstStep}
                        className="btn-ghost inline-flex min-h-9 items-center gap-1 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <ChevronLeft size={14} aria-hidden="true" />
                        이전
                    </button>
                    <button
                        type="button"
                        onClick={isLastStep
                            ? onDismiss
                            : () => setStepIndex(current => current + 1)}
                        className="btn-primary inline-flex min-h-9 items-center gap-1 px-3 py-2 text-xs"
                    >
                        {isLastStep ? '완료' : '다음'}
                        {!isLastStep && <ChevronRight size={14} aria-hidden="true" />}
                    </button>
                </div>
            </div>
        </motion.aside>
    );
};
