"use client";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { usePortalContainer } from "./portal";
import { jakartaDate } from "@/lib/domain/model";
function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || format(date) !== value
    ? undefined
    : date;
}
function format(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export default function DateInput({
  label,
  value,
  onChange,
  required,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
}) {
  const { container, anchorRef } = usePortalContainer();
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="date-control">
        <input
          aria-label={label}
          type="text"
          placeholder="YYYY-MM-DD"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          readOnly={readOnly}
          autoComplete="off"
        />
        <Popover.Trigger
          ref={anchorRef}
          className="calendar-trigger"
          type="button"
          aria-label={`Choose ${label.toLowerCase()}`}
          disabled={readOnly}
        >
          <CalendarDays size={17} />
        </Popover.Trigger>
      </div>
      <Popover.Portal container={container}>
        <Popover.Content
          className="calendar-popover"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-label={`Choose ${label.toLowerCase()}`}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected || parse(jakartaDate())}
            today={parse(jakartaDate())}
            autoFocus
            showOutsideDays
            fixedWeeks
            onSelect={(date) => {
              if (date) {
                onChange(format(date));
                setOpen(false);
              }
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                ),
            }}
          />
          <div className="calendar-footer">
            <button
              type="button"
              className="button small"
              onClick={() => {
                onChange(jakartaDate());
                setOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
