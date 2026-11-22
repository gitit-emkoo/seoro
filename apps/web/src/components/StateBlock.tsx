export function LoadingSpinner({ size = 36 }: { size?: number }) {
  return (
    <span
      className="loading-spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="로딩 중"
    />
  );
}

export function LoadingBlock(_props?: { message?: string }) {
  return (
    <main className="shell loading-shell">
      <div className="loading-panel">
        <LoadingSpinner />
      </div>
    </main>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card stack">
      <strong>{title}</strong>
      <p className="muted">{description}</p>
      {action}
    </section>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <section className="card stack">
      <p className="error">{message}</p>
      <p className="muted">잠시 후 다시 시도하거나, 이전 화면에서 상태를 확인해 주세요.</p>
      {onRetry ? (
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </section>
  );
}
