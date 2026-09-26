"use client";
import { ChevronUp, Save } from "lucide-react";
import { rupiah } from "@/lib/domain/calculate";
/** A reachable save action while editing long documents on phones and tablets. */
export default function DocumentActionBar({
  total,
  label,
  reviewId,
  onSave,
  disabled,
  saveLabel,
}: {
  total: string | null;
  label: string;
  reviewId: string;
  onSave?: () => void;
  disabled: boolean;
  saveLabel: string;
}) {
  return (
    <div
      className="document-action-bar"
      role="region"
      aria-label="Document quick actions"
    >
      <a
        href={`#${reviewId}`}
        className="document-quick-total"
        aria-label="Review document totals"
      >
        <span>
          {label}
          <ChevronUp size={14} />
        </span>
        <strong>{total === null ? "Check amounts" : rupiah(total)}</strong>
      </a>
      {onSave ? (
        <button
          type="button"
          className="button primary"
          onClick={onSave}
          disabled={disabled}
        >
          <Save size={16} />
          {saveLabel}
        </button>
      ) : (
        <a className="button" href={`#${reviewId}`}>
          View summary
        </a>
      )}
    </div>
  );
}
