"use client";
import { useId, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePortalContainer } from "./portal";
import { jakartaDate } from "@/lib/domain/model";
import {
  dateValue,
  eventDateLabel,
  eventDays,
  parseDate,
} from "@/lib/domain/event-dates";

export default function EventDateRange({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const { container, anchorRef } = usePortalContainer();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>();
  const [waiting, setWaiting] = useState(false);
  const [touched, setTouched] = useState(false);
  const hintId = useId();
  const errorId = useId();
  const days = eventDays(start, end);
  const error =
    end && !start
      ? "Choose a start date first."
      : parseDate(start) && parseDate(end) && end < start
        ? "End date must be on or after the start date."
        : touched && ((start && !parseDate(start)) || (end && !parseDate(end)))
          ? "Enter a valid date in YYYY-MM-DD format."
          : "";
  function toggle(value: boolean) {
    if (value) {
      const from = parseDate(start);
      setDraft(from ? { from, to: parseDate(end) || from } : undefined);
      setWaiting(false);
    }
    setOpen(value);
  }
  return (
    <div className="event-date-range">
      <div className="event-date-heading">
        <span className="field-caption">
          Event schedule <span className="muted small-text">Optional</span>
        </span>
        {days && (
          <span className="event-days-badge">
            {days} {days === 1 ? "day" : "days"}
          </span>
        )}
      </div>
      <div className="event-date-inputs">
        <label className="field">
          <span>Start date</span>
          <input
            type="text"
            aria-label="Event start date"
            placeholder="YYYY-MM-DD"
            autoComplete="off"
            value={start}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hintId}
            onBlur={() => setTouched(true)}
            onChange={(e) => onChange(e.target.value, end)}
          />
        </label>
        <label className="field">
          <span>End date</span>
          <input
            type="text"
            aria-label="Event end date"
            placeholder="Same as start"
            autoComplete="off"
            value={end}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hintId}
            onBlur={() => setTouched(true)}
            onChange={(e) => onChange(start, e.target.value)}
          />
        </label>
      </div>
      <div className="event-date-tools">
        <Popover.Root open={open} onOpenChange={toggle}>
          <Popover.Trigger
            ref={anchorRef}
            type="button"
            className="button"
            aria-label="Choose event dates"
          >
            <CalendarRange size={17} /> Choose dates
          </Popover.Trigger>
          <Popover.Portal container={container}>
            <Popover.Content
              className="calendar-popover event-range-popover"
              align="start"
              sideOffset={8}
              collisionPadding={12}
              aria-label="Choose event dates"
              onEscapeKeyDown={(e) => e.stopPropagation()}
            >
              <div className="range-picker-heading">
                <strong>Event dates</strong>
                <Popover.Close
                  className="icon-button"
                  aria-label="Close date picker"
                >
                  <X size={17} />
                </Popover.Close>
              </div>
              <p className="range-picker-help" role="status">
                {waiting
                  ? "Now choose the last day, or use this single day."
                  : "Choose the first day, then the last day."}
              </p>
              <DayPicker
                mode="range"
                selected={draft}
                defaultMonth={draft?.from || parseDate(jakartaDate())}
                today={parseDate(jakartaDate())}
                autoFocus
                showOutsideDays
                onSelect={(range, day) => {
                  setDraft(
                    waiting ? range || { from: day, to: day } : { from: day },
                  );
                  setWaiting(!waiting);
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
              <p className="range-selection-preview">
                {draft?.from
                  ? eventDateLabel(
                      dateValue(draft.from),
                      draft.to ? dateValue(draft.to) : "",
                    )
                  : "No dates selected"}
              </p>
              <div className="calendar-footer">
                <button
                  type="button"
                  className="button small"
                  onClick={() => {
                    onChange(jakartaDate(), jakartaDate());
                    setOpen(false);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="button primary small"
                  disabled={!draft?.from}
                  onClick={() => {
                    if (draft?.from) {
                      onChange(
                        dateValue(draft.from),
                        dateValue(draft.to || draft.from),
                      );
                      setOpen(false);
                    }
                  }}
                >
                  Use dates
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {(start || end) && (
          <button
            type="button"
            className="button small"
            onClick={() => {
              onChange("", "");
              setTouched(false);
            }}
          >
            Clear dates
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      <p id={hintId} className="muted small-text">
        Leave the end date blank for a single-day event. Item billing durations
        stay unchanged until you update them.
      </p>
    </div>
  );
}
