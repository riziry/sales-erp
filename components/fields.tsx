"use client";
import type { ReactNode } from "react";
import type { Basis, Discount } from "@/lib/domain/model";
export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      <input
        aria-label={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? "0" : undefined}
      />
    </label>
  );
}
export function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
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
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
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
  onChange: (v: Basis) => void;
}) {
  return (
    <Select label={label} value={value} onChange={(v) => onChange(v as Basis)}>
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
  onChange: (v: Discount) => void;
}) {
  return (
    <div className="discount-field">
      <Select
        label={label}
        value={value.type}
        onChange={(v) => onChange({ ...value, type: v as Discount["type"] })}
      >
        <option value="PERCENT">Percent (%)</option>
        <option value="AMOUNT">Rupiah (Rp)</option>
      </Select>
      <Field
        label={`${label} value`}
        type="number"
        value={value.value}
        onChange={(v) => onChange({ ...value, value: v })}
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
