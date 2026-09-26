"use client";
import { useState, type ReactNode } from "react";
import { Check as CheckIcon, Eye, EyeOff } from "lucide-react";
import type { Basis, Discount } from "@/lib/domain/model";
import { SelectControl, selectChoices } from "./ui/select";
import NumberInput from "./ui/number-input";
import DateInput from "./ui/date-input";
export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
  currency = false,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  currency?: boolean;
  min?: number;
  max?: number;
}) {
  const [visible, setVisible] = useState(false);
  const common = { label, value, onChange, required, readOnly, placeholder };
  return (
    <div className="field">
      <span>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {type === "number" ? (
        <NumberInput {...common} currency={currency} min={min} max={max} />
      ) : type === "date" ? (
        <DateInput {...common} />
      ) : (
        <div
          className={type === "password" ? "password-control" : "text-control"}
        >
          <input
            aria-label={label}
            type={type === "password" && visible ? "text" : type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            required={required}
            readOnly={readOnly}
          />
          {type === "password" && (
            <button
              type="button"
              className="icon-button"
              aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export function Area({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <SelectControl
        label={label}
        value={value}
        onChange={onChange}
        choices={selectChoices(children)}
      />
    </div>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="check">
      <span className="checkbox-control">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <CheckIcon size={13} aria-hidden="true" />
      </span>
      {label}
    </label>
  );
}
export function BasisField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Basis;
  onChange: (value: Basis) => void;
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(value) => onChange(value as Basis)}
    >
      <option value="DAILY">Per day</option>
      <option value="ONE_TIME">Once / event</option>
    </Select>
  );
}
export function DiscountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Discount;
  onChange: (value: Discount) => void;
}) {
  return (
    <div className="discount-field">
      <Select
        label={label}
        value={value.type}
        onChange={(type) =>
          onChange({ ...value, type: type as Discount["type"] })
        }
      >
        <option value="PERCENT">Percent (%)</option>
        <option value="AMOUNT">Rupiah (Rp)</option>
      </Select>
      <Field
        label={`${label} value`}
        type="number"
        currency={value.type === "AMOUNT"}
        max={value.type === "PERCENT" ? 100 : undefined}
        value={value.value}
        onChange={(amount) => onChange({ ...value, value: amount })}
      />
    </div>
  );
}
export function Notice({
  text,
  success = false,
}: {
  text: string;
  success?: boolean;
}) {
  return text ? (
    <p
      role={success ? "status" : "alert"}
      className={`notice ${success ? "success" : ""}`}
    >
      {text}
    </p>
  ) : null;
}
