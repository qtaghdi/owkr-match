import { BarChart3, ShieldCheck } from 'lucide-react';
import type { MatchResultData } from '../../../types';

interface BalanceSummaryProps {
    matchResult: MatchResultData;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

const formatScore = (score: number | undefined): string => (
    score === undefined ? '—' : NUMBER_FORMATTER.format(Math.round(score))
);

/**
 * @description 팀 총점과 역할별 차이, 배정 예외를 한눈에 비교할 수 있게 보여준다.
 */
const BalanceSummary = ({ matchResult }: BalanceSummaryProps) => {
    const { metrics, teamA, teamB } = matchResult;
    const totalDiff = metrics?.totalDiff ?? matchResult.diff;
    const exceptions = [
        { label: '선호 역할 이탈', value: metrics?.preferenceViolations },
        { label: '비선호 배정', value: metrics?.avoidedAssignments },
        { label: '미배치 역할', value: metrics?.unrankedAssignments },
    ];
    const roleDiffs = [
        { label: '탱커 차이', value: metrics?.roleDiffs.tank },
        { label: '딜러 차이', value: metrics?.roleDiffs.dps },
        { label: '힐러 차이', value: metrics?.roleDiffs.support },
    ];

    return (
        <section
            data-exclude-export
            className="rounded-xl border border-slate-800/80 bg-surface-elevated/70 p-3.5"
            aria-labelledby="balance-summary-title"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-cyan-300" aria-hidden="true" />
                    <h3 id="balance-summary-title" className="text-sm font-semibold text-slate-100">
                        밸런스 요약
                    </h3>
                </div>
                <p className="text-xs tabular-nums text-slate-500">
                    1팀 {formatScore(teamA.realScore)} · 2팀 {formatScore(teamB.realScore)}
                </p>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-2">
                    <dt className="text-[11px] text-cyan-200/70">총점 차이</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-cyan-100">
                        {formatScore(totalDiff)}
                    </dd>
                </div>
                {roleDiffs.map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-surface px-3 py-2">
                        <dt className="text-[11px] text-slate-500">{label}</dt>
                        <dd className="mt-1 font-mono text-sm tabular-nums text-slate-300">
                            {formatScore(value)}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-slate-500">
                    <ShieldCheck size={12} aria-hidden="true" />
                    배정 예외
                </span>
                {exceptions.map(({ label, value }) => (
                    <span
                        key={label}
                        className={`rounded-full border px-2 py-1 tabular-nums ${
                            value === undefined
                                ? 'border-slate-700 bg-slate-800/60 text-slate-400'
                                : value === 0
                                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                                : 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300'
                        }`}
                    >
                        {label} {value === undefined ? '—' : `${value}명`}
                    </span>
                ))}
            </div>
        </section>
    );
};

export default BalanceSummary;
