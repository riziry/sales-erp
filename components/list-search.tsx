"use client";
import { useRef } from "react";
import { Search, X } from "lucide-react";
export default function ListSearch({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="search list-search">
      <Search size={18} aria-hidden="true" />
      <input
        ref={input}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
      />
      {value && (
        <button
          type="button"
          className="icon-button search-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
