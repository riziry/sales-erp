"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Picker } from "./search-picker";
import { Notice, Select } from "./fields";
import { createInvoiceAction } from "@/lib/server/invoice-actions";
import {
  invoiceAmounts,
  invoiceKinds,
  type InvoiceKind,
} from "@/lib/domain/invoice";
import { rupiah } from "@/lib/domain/calculate";
export type InvoiceSource = {
  id: string;
  version: number;
  seriesId: string;
  number: string;
  revision: number;
  event: string;
  customer: string;
  net: string;
  ppn: string;
  pph: string;
  total: string;
};
export type BillingPlan = {
  id: string;
  seriesId: string;
  kind: InvoiceKind;
  net: string;
  ppn: string;
  pph: string;
  total: string;
  quotationRevision: number;
};
export default function InvoiceCreate({
  sources,
  plans,
  initial,
}: {
  sources: InvoiceSource[];
  plans: BillingPlan[];
  initial: string;
}) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(initial);
  const [kind, setKind] = useState<InvoiceKind>(
    plans.some(
      (plan) =>
        plan.seriesId === sources.find((s) => s.id === initial)?.seriesId &&
        plan.kind === "DEPOSIT",
    )
      ? "FINAL"
      : "FULL",
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const source = sources.find((s) => s.id === sourceId);
  const active = plans.filter((plan) => plan.seriesId === source?.seriesId);
  const existing = active.find((plan) => plan.kind === kind);
  const blocked =
    !existing &&
    ((kind === "FULL" && active.length > 0) ||
      active.some((plan) => plan.kind === "FULL") ||
      (kind === "FINAL" && !active.some((plan) => plan.kind === "DEPOSIT")));
  const base = active[0] || source;
  return (
    <div className="editor-layout">
      <section className="panel padded">
        <h2>Choose the quotation and billing type</h2>
        <p className="section-description">
          An invoice copies the saved customer details, items, discounts, taxes,
          and bank account. You can review the draft before issuing it.
        </p>
        <fieldset disabled={pending} className="stack">
          <Picker
            label="Source quotation"
            value={sourceId}
            options={sources.map((s) => ({
              id: s.id,
              label: `${s.number} · R${s.revision}`,
              description: `${s.customer} · ${s.event}`,
              detail: rupiah(s.total),
            }))}
            placeholder="Search quotation, customer, or event…"
            onChange={(id) => {
              setSourceId(id);
              setError("");
              setKind(
                plans.some(
                  (p) =>
                    p.seriesId === sources.find((s) => s.id === id)?.seriesId &&
                    p.kind === "DEPOSIT",
                )
                  ? "FINAL"
                  : "FULL",
              );
            }}
          />
          <Select
            label="Invoice type"
            value={kind}
            onChange={(value) => {
              setKind(value as InvoiceKind);
              setError("");
            }}
          >
            {Object.entries(invoiceKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {source && (
            <div className="inset">
              <strong>{source.customer}</strong>
              <p>{source.event}</p>
              <Link className="back-link" href={`/quotation/${source.id}`}>
                Open source quotation ↗
              </Link>
            </div>
          )}
          {!!active.length && (
            <p className="notice info">
              This quotation already has a billing plan. Installments use its
              original R{active[0].quotationRevision} snapshot, including prices
              and taxes.
            </p>
          )}
          {!!blocked && (
            <p className="notice info">
              {kind === "FINAL" && !active.length
                ? "Create a down payment invoice first."
                : "Use the existing billing plan. To switch between full and split billing, void its invoices first."}
            </p>
          )}
          <Notice text={error} />
          {existing ? (
            <Link className="button primary" href={`/invoice/${existing.id}`}>
              Open existing invoice
            </Link>
          ) : (
            <button
              className="button primary"
              disabled={!source || !!blocked || pending}
              onClick={() => {
                if (!source) return;
                start(async () => {
                  const result = await createInvoiceAction(
                    source.id,
                    source.version,
                    kind,
                  );
                  if (!result.ok) setError(result.error);
                  else router.push(`/invoice/${result.id}`);
                });
              }}
            >
              {pending ? "Creating…" : "Create invoice draft"}
            </button>
          )}
          {!sources.length && (
            <p className="muted">
              Create and save a quotation with at least one item first.{" "}
              <Link href="/quotation/new" className="table-link">
                Create quotation
              </Link>
            </p>
          )}
        </fieldset>
      </section>
      <aside className="panel padded">
        <p className="eyebrow">INVOICE PREVIEW</p>
        <h2>{invoiceKinds[kind]}</h2>
        <div className="summary-row">
          <span>Full project total</span>
          <strong>{base ? rupiah(base.total) : "—"}</strong>
        </div>
        <div className="grand-total">
          <span>Amount on this invoice</span>
          <strong>
            {base ? rupiah(invoiceAmounts(base, kind).total) : "—"}
          </strong>
        </div>
        <p className="muted small-text">
          Full payment bills 100%. Down payment and final installment each bill
          50%, with rounding balanced between them. Creating an invoice does not
          record a payment or send an email.
        </p>
      </aside>
    </div>
  );
}
