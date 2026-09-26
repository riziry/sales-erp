"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <p className="eyebrow">sales-erp</p>
      <h1>This page could not be loaded.</h1>
      <p>
        Check the database connection and application settings, then try again.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
