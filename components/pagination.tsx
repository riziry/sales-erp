"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function Pagination({
  count,
  page,
  onChange,
  size = 20,
}: {
  count: number;
  page: number;
  onChange: (page: number) => void;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="table-footer pagination">
      <span role="status" aria-live="polite">
        {count
          ? `${page * size + 1}–${Math.min((page + 1) * size, count)} of ${count}`
          : "0 results"}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Next page"
          disabled={page + 1 >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
