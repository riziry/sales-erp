"use client";
export default function PrintButton() {
  return (
    <>
      <button className="button primary" onClick={() => window.print()}>
        Print / Save PDF
      </button>
      <small className="print-settings-hint">
        Use A4 and default margins. If a URL or page number appears, turn off
        “Headers and footers” in your browser’s print settings.
      </small>
    </>
  );
}
