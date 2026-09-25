"use client";
export default function PrintButton() {
  return (
    <button className="button primary" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
