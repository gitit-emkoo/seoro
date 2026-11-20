/** 온보딩 카드용 에디토리얼 비주얼 — 자극적 연출 없이 상호성·균형을 표현 */

export function OnboardingVisual({ variant }: { variant: 0 | 1 | 2 | 3 }) {
  if (variant === 0) {
    return (
      <div className="ob-visual ob-visual-1" aria-hidden>
        <div className="ob-silhouette ob-silhouette-left" />
        <div className="ob-gap">
          <span className="ob-gap-dot" />
          <span className="ob-gap-dot" />
          <span className="ob-gap-dot" />
        </div>
        <div className="ob-silhouette ob-silhouette-right" />
      </div>
    );
  }

  if (variant === 1) {
    return (
      <div className="ob-visual ob-visual-2" aria-hidden>
        <div className="ob-window">
          <div className="ob-window-warm" />
          <div className="ob-window-note" />
        </div>
      </div>
    );
  }

  if (variant === 2) {
    return (
      <div className="ob-visual ob-visual-3" aria-hidden>
        <div className="ob-stat-orb">
          <strong>91,151</strong>
          <span>2024 이혼 건수</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-visual ob-visual-4" aria-hidden>
      <div className="ob-pair-seat">
        <div className="ob-seat-figure" />
        <div className="ob-seat-screen" />
        <div className="ob-seat-figure ob-seat-figure-b" />
      </div>
    </div>
  );
}
