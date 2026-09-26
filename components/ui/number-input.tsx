"use client";
import { useRef } from "react";
import { Minus, Plus } from "lucide-react";
import Decimal from "decimal.js";
import {
  formatNumberInput,
  numberCaret,
  parseNumberInput,
} from "@/lib/domain/number-input";
export default function NumberInput({
  label,
  value,
  onChange,
  currency = false,
  placeholder,
  required,
  readOnly,
  min = 0,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency?: boolean;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const display = formatNumberInput(value);
  function edit(raw: string, cursor: number) {
    const parsed = parseNumberInput(raw);
    if (parsed === null) return;
    const meaningful = (raw.slice(0, cursor).match(/[\d,]/g) || []).length;
    onChange(parsed);
    requestAnimationFrame(() => {
      const input = ref.current;
      if (input && document.activeElement === input) {
        const caret = numberCaret(input.value, meaningful);
        input.setSelectionRange(caret, caret);
      }
    });
  }
  function step(delta: number) {
    let next = new Decimal(value || "0").plus(delta);
    next = Decimal.max(next, min);
    if (max !== undefined) next = Decimal.min(next, max);
    onChange(next.toString());
  }
  return (
    <div
      className={`number-control ${currency ? "currency-control" : "stepper-control"}`}
    >
      {currency ? (
        <span className="currency-prefix" aria-hidden="true">
          Rp
        </span>
      ) : (
        <button
          type="button"
          className="stepper-button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={readOnly || Number(value || 0) <= min}
          onClick={() => step(-1)}
        >
          <Minus size={14} />
        </button>
      )}
      <input
        ref={ref}
        aria-label={label}
        role={currency ? undefined : "spinbutton"}
        aria-valuemin={currency ? undefined : min}
        aria-valuemax={currency ? undefined : max}
        aria-valuenow={
          !currency && value && Number.isFinite(Number(value))
            ? Number(value)
            : undefined
        }
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        placeholder={placeholder || (currency ? "0" : undefined)}
        required={required}
        readOnly={readOnly}
        onChange={(event) =>
          edit(
            event.target.value,
            event.target.selectionStart ?? event.target.value.length,
          )
        }
        onBlur={() => {
          if (value.endsWith(".")) onChange(value.slice(0, -1));
        }}
        onKeyDown={(event) => {
          if (readOnly) return;
          if (
            !currency &&
            (event.key === "ArrowUp" || event.key === "ArrowDown")
          ) {
            event.preventDefault();
            step(event.key === "ArrowUp" ? 1 : -1);
            return;
          }
          const input = event.currentTarget,
            start = input.selectionStart ?? 0;
          if (input.selectionEnd !== start) return;
          if (
            event.key === "Backspace" &&
            start > 1 &&
            display[start - 1] === "."
          ) {
            event.preventDefault();
            edit(display.slice(0, start - 2) + display.slice(start), start - 2);
          }
          if (event.key === "Delete" && display[start] === ".") {
            event.preventDefault();
            edit(display.slice(0, start) + display.slice(start + 2), start);
          }
        }}
      />
      {!currency && (
        <button
          type="button"
          className="stepper-button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={
            readOnly || (max !== undefined && Number(value || 0) >= max)
          }
          onClick={() => step(1)}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
