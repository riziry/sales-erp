"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCheck,
  Plus,
  RotateCcw,
  Send,
  Trophy,
  FileText,
  Clock3,
} from "lucide-react";
import { rupiah } from "@/lib/domain/calculate";
import { statusNames, type Status } from "@/lib/domain/model";
import {
  addFollowupAction,
  completeFollowupAction,
} from "@/lib/server/sales-actions";
import { Field, Area, Notice } from "./fields";
import { Picker } from "./search-picker";
import Modal from "./modal";
import { useUI } from "./ui-provider";
import Pagination from "./pagination";
type SalesRow = {
  id: string;
  seriesId: string;
  number: string;
  event: string;
  customer: string;
  status: Status;
  validUntil: string;
  net: string;
};
type Task = {
  id: string;
  seriesId: string;
  note: string;
  dueDate: string;
  done: boolean;
};
export default function SalesOverview({
  rows,
  tasks,
  today,
}: {
  rows: SalesRow[];
  tasks: Task[];
  today: string;
}) {
  const router = useRouter();
  const { notify } = useUI();
  const [modal, setModal] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [tab, setTab] = useState("open");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const open = tasks.filter((t) => !t.done);
  const due = open.filter((t) => t.dueDate <= today);
  const week = new Date(`${today}T12:00:00Z`);
  week.setUTCDate(week.getUTCDate() + 7);
  const nextWeek = week.toISOString().slice(0, 10);
  const expiring = rows
    .filter((q) => q.status === "SENT" && q.validUntil <= nextWeek)
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil));
  const filtered = tasks.filter((t) => {
    const q = rows.find((q) => q.seriesId === t.seriesId);
    return (
      (tab === "done"
        ? t.done
        : !t.done && (tab !== "due" || t.dueDate <= today)) &&
      `${t.note} ${q?.customer} ${q?.event} ${q?.number}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 10) - 1),
  );
  function addTask() {
    setError("");
    if (!seriesId || !note.trim() || !dueDate) {
      setError("Choose a quotation, date, and next step.");
      return;
    }
    start(async () => {
      const result = await addFollowupAction({ seriesId, dueDate, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setModal(false);
      setNote("");
      notify("Follow-up scheduled");
      router.refresh();
    });
  }
  function toggleTask(task: Task) {
    setError("");
    start(async () => {
      const result = await completeFollowupAction(task.id, !task.done);
      if (!result.ok) setError(result.error);
      else {
        notify(task.done ? "Follow-up reopened" : "Follow-up completed");
        router.refresh();
      }
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR NEXT MOVE</p>
          <h1>Sales overview</h1>
          <p className="muted">
            Keep every conversation moving toward a decision.
          </p>
        </div>
        <Link className="button primary" href="/quotation/new">
          <Plus size={17} />
          Create quotation
        </Link>
      </div>
      <div className="sales-banner">
        <div className="sales-banner-icon">
          <CalendarClock size={25} />
        </div>
        <div>
          <strong>
            {due.length
              ? `${due.length} follow-up${due.length > 1 ? "s need" : " needs"} your attention`
              : "A clear plan for your next conversation"}
          </strong>
          <p>
            {due.length
              ? "Review today's tasks and overdue reminders below."
              : "Schedule a next step after sending each quotation."}
          </p>
        </div>
        <button
          className="button"
          disabled={!rows.length}
          onClick={() => {
            setError("");
            setModal(true);
          }}
        >
          Schedule follow-up
          <Plus size={16} />
        </button>
      </div>
      <div className="overview-grid sales-metrics">
        {[
          { label: "Draft value", status: "DRAFT", Icon: FileText },
          { label: "Awaiting response", status: "SENT", Icon: Send },
          { label: "Approved value", status: "APPROVED", Icon: Trophy },
        ].map(({ label, status, Icon }) => {
          const selected = rows.filter((q) => q.status === status);
          return (
            <Link
              className="overview-card"
              key={status}
              href={`/quotation?status=${status}`}
            >
              <span>
                {label}
                <Icon size={18} />
              </span>
              <strong>
                {rupiah(
                  selected
                    .reduce((sum, q) => sum.plus(q.net), new Decimal(0))
                    .toFixed(0),
                )}
              </strong>
              <small>
                {selected.length} quotations
                <ArrowUpRight size={14} />
              </small>
            </Link>
          );
        })}
        <div className="overview-card">
          <span>
            Decision win rate
            <CheckCheck size={18} />
          </span>
          <strong>
            {rows.filter(
              (q) => q.status === "APPROVED" || q.status === "REJECTED",
            ).length
              ? `${Math.round((rows.filter((q) => q.status === "APPROVED").length / rows.filter((q) => q.status === "APPROVED" || q.status === "REJECTED").length) * 100)}%`
              : "—"}
          </strong>
          <small>Approved ÷ (approved + rejected)</small>
        </div>
      </div>
      <p className="sales-metric-note muted">
        All time · latest revisions · values after discounts, excluding taxes ·
        approved value is not a payment received.
      </p>
      {!modal && <Notice text={error} />}
      <div className="sales-columns">
        <section className="panel padded followup-panel">
          <div className="section-heading">
            <h2>
              Customer follow-ups
              <span className="count-pill">{open.length}</span>
            </h2>
            <button
              className="button small"
              disabled={!rows.length}
              onClick={() => {
                setError("");
                setModal(true);
              }}
            >
              <Plus size={15} />
              Add
            </button>
          </div>
          <div className="task-tabs" role="group" aria-label="Follow-up filter">
            {[
              { id: "open", label: "Open" },
              { id: "due", label: `Due now (${due.length})` },
              { id: "done", label: "Completed" },
            ].map(({ id, label }) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="task-search"
            aria-label="Search follow-ups"
            placeholder="Search customer or next step…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
          <div className="task-list">
            {filtered
              .slice(currentPage * 10, (currentPage + 1) * 10)
              .map((task) => {
                const q = rows.find((q) => q.seriesId === task.seriesId);
                return (
                  <article
                    className={`task-row ${task.done ? "task-done" : ""}`}
                    key={task.id}
                  >
                    <button
                      className="task-check"
                      aria-label={`${task.done ? "Reopen" : "Complete"} ${task.note}`}
                      disabled={pending}
                      onClick={() => toggleTask(task)}
                    >
                      {task.done ? (
                        <RotateCcw size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <div>
                      <strong>{task.note}</strong>
                      {q && (
                        <Link href={`/quotation/${q.id}`}>
                          {q.customer} · {q.number}
                          <ArrowUpRight size={12} />
                        </Link>
                      )}
                      <span
                        className={`task-date ${!task.done && task.dueDate < today ? "overdue" : ""}`}
                      >
                        <Clock3 size={12} />
                        {task.dueDate === today ? "Today" : task.dueDate}
                        {!task.done && task.dueDate < today ? " · Overdue" : ""}
                      </span>
                    </div>
                  </article>
                );
              })}
          </div>
          {!filtered.length && (
            <div className="empty-state">
              <CheckCheck size={28} />
              <h3>
                {query
                  ? "No matching follow-ups"
                  : tab === "done"
                    ? "Completed tasks will appear here"
                    : "You're all caught up"}
              </h3>
              <p>
                {rows.length
                  ? "Add a reminder to call, check feedback, or confirm an event."
                  : "Create your first quotation to schedule a follow-up."}
              </p>
            </div>
          )}
          <Pagination
            count={filtered.length}
            page={currentPage}
            size={10}
            onChange={setPage}
          />
        </section>
        <section className="panel padded expiry-panel">
          <div className="section-heading">
            <h2>Offers to revisit</h2>
            <CalendarClock size={18} />
          </div>
          <p className="section-description">
            Sent quotations that expired or will expire in the next 7 days.
          </p>
          {expiring.slice(0, 10).map((q) => (
            <Link className="expiry-row" key={q.id} href={`/quotation/${q.id}`}>
              <div>
                <strong>{q.customer}</strong>
                <span>{q.event}</span>
                <small>
                  {q.number} · {statusNames[q.status]}
                </small>
              </div>
              <div>
                <span
                  className={`badge ${q.validUntil < today ? "amber" : ""}`}
                >
                  {q.validUntil < today
                    ? "Expired"
                    : q.validUntil === today
                      ? "Expires today"
                      : q.validUntil}
                </span>
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}
          {!expiring.length && (
            <div className="empty-state">
              <CalendarClock size={28} />
              <h3>No offers expiring soon</h3>
              <p>Check here after sending your quotations.</p>
            </div>
          )}
          {expiring.length > 10 && (
            <Link className="button small" href="/quotation?status=SENT">
              View all sent quotations
            </Link>
          )}
          <p className="small-text muted">
            Reminders stay internal. No emails or messages are sent
            automatically.
          </p>
        </section>
      </div>
      {modal && (
        <Modal
          title="Schedule a follow-up"
          busy={pending}
          onClose={() => setModal(false)}
        >
          <p className="section-description">
            Give your next customer conversation a clear next step.
          </p>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              addTask();
            }}
          >
            <fieldset disabled={pending} className="stack">
              <Picker
                label="Quotation to follow up"
                value={seriesId}
                options={rows.map((q) => ({
                  id: q.seriesId,
                  label: `${q.customer} · ${q.number}`,
                  description: q.event,
                  keywords: statusNames[q.status],
                }))}
                onChange={setSeriesId}
              />
              <Field
                label="Follow-up date"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                required
              />
              <Area label="Next step" value={note} onChange={setNote} />
              <Notice text={error} />
              <div className="form-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button className="button primary" type="submit">
                  {pending ? "Scheduling…" : "Schedule follow-up"}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </>
  );
}
