type Step = {
  key: string;
  label: string;
};

const DEFAULT_STEPS: Step[] = [
  { key: 'connect', label: '연결' },
  { key: 'scope', label: '항목' },
  { key: 'pay', label: '결제' },
  { key: 'submit', label: '자료' },
  { key: 'report', label: '결과' },
];

export function ProgressSteps({
  current,
  completed = false,
  steps = DEFAULT_STEPS,
}: {
  current: string;
  /** true면 모든 단계를 완료로 표시 (서로공개 종료) */
  completed?: boolean;
  steps?: Step[];
}) {
  const found = steps.findIndex((s) => s.key === current);
  const idx = completed ? steps.length : Math.max(0, found);

  return (
    <div className="progress-steps" aria-label="진행 단계">
      {steps.map((step, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        return (
          <div className={`progress-step ${state}`} key={step.key}>
            <span className="progress-dot" />
            <span className="progress-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
