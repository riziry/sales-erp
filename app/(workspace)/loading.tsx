export default function Loading() {
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-label="Loading workspace"
      aria-live="polite"
    >
      <span className="sr-only">Loading your workspace…</span>
      <div aria-hidden="true">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-subtitle" />
        <div className="skeleton-cards">
          {[0, 1, 2].map((value) => (
            <div key={value} className="skeleton skeleton-card" />
          ))}
        </div>
        <div className="panel skeleton-table">
          {[0, 1, 2, 3, 4].map((value) => (
            <div key={value} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    </div>
  );
}
