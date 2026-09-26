"use client";
import DocumentActionBar from "./document-action-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useUI } from "./ui-provider";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { Area, Field, Notice } from "./fields";
import {
  invoiceAmounts,
  invoiceKinds,
  invoiceStatuses,
  type InvoiceDetails,
} from "@/lib/domain/invoice";
import { rupiah } from "@/lib/domain/calculate";
import {
  invoiceStatusAction,
  saveInvoiceAction,
} from "@/lib/server/invoice-actions";
import type { Invoice } from "@/lib/server/invoices";
export default function InvoiceEditor({
  invoice,
  siblings,
}: {
  invoice: Invoice;
  siblings: {
    id: string;
    kind: Invoice["kind"];
    number: string;
    status: Invoice["status"];
  }[];
}) {
  const router = useRouter();
  const [details, setDetails] = useState(invoice.details);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const editable = invoice.status === "DRAFT";
  const amount = invoiceAmounts(invoice.document, invoice.kind);
  const { confirm, notify } = useUI();
  useUnsavedChanges(dirty, "invoice");
  function update<K extends keyof InvoiceDetails>(
    key: K,
    value: InvoiceDetails[K],
  ) {
    setDetails((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }
  function save() {
    setError("");
    start(async () => {
      const result = await saveInvoiceAction(
        invoice.id,
        invoice.version,
        details,
      );
      if (!result.ok) setError(result.error);
      else {
        setDirty(false);
        notify("Invoice saved successfully.");
        router.refresh();
      }
    });
  }
  async function changeStatus(status: "ISSUED" | "VOID") {
    const accepted = await confirm({
      title: status === "VOID" ? "Void this invoice?" : "Issue this invoice?",
      description:
        status === "VOID"
          ? "The invoice will remain available for reference, but cannot be edited or issued."
          : "Issuing locks the invoice details. You can still print it or void it later.",
      confirmLabel: status === "VOID" ? "Void invoice" : "Issue invoice",
      danger: status === "VOID",
    });
    if (!accepted) return;
    setError("");
    start(async () => {
      const result = await invoiceStatusAction(
        invoice.id,
        invoice.version,
        status,
      );
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }
  return (
    <>
      <Link href="/invoice" className="back-link">
        ← All invoices
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{invoiceKinds[invoice.kind].toUpperCase()}</p>
          <h1>{invoice.number}</h1>
          <p className="muted">
            {invoice.document.customer.name} · {invoice.document.event}
          </p>
        </div>
        <div className="heading-actions">
          <span className={`badge status-${invoice.status.toLowerCase()}`}>
            {invoiceStatuses[invoice.status]}
          </span>
          <Link
            href={`/invoice/${invoice.id}/print`}
            target="_blank"
            className="button"
          >
            Print / PDF ↗
          </Link>
          {editable && (
            <button
              className="button primary"
              onClick={save}
              disabled={pending || !dirty}
            >
              {pending ? "Saving…" : "Save invoice"}
            </button>
          )}
        </div>
      </div>
      <Notice text={error} />
      {!editable && (
        <p className="notice info">
          {invoice.status === "VOID"
            ? "This invoice is void and is not a payment request."
            : "This issued invoice is preserved. Its content cannot be edited."}
        </p>
      )}
      <div className="editor-layout">
        <div className="stack">
          <section className="panel padded">
            <h2>Invoice details</h2>
            <p className="section-description">
              Source:{" "}
              <Link
                className="table-link"
                href={`/quotation/${invoice.quotationId}`}
              >
                {invoice.quotationNumber} · R{invoice.quotationRevision}
              </Link>
              . Prices, customer details, and taxes are saved with this invoice.
            </p>
            <fieldset disabled={!editable || pending}>
              <div className="form-grid">
                <Field
                  label="Invoice date"
                  type="date"
                  value={details.date}
                  onChange={(v) => update("date", v)}
                />
                <Field
                  label="Due date"
                  type="date"
                  value={details.dueDate}
                  onChange={(v) => update("dueDate", v)}
                />
              </div>
              <h3>Payment bank account</h3>
              <div className="form-grid three">
                {(["bank", "number", "holder"] as const).map((key) => (
                  <Field
                    key={key}
                    label={
                      {
                        bank: "Bank name",
                        number: "Account number",
                        holder: "Account holder",
                      }[key]
                    }
                    value={details.bank[key]}
                    onChange={(v) =>
                      update("bank", { ...details.bank, [key]: v })
                    }
                  />
                ))}
              </div>
              <div className="stack">
                <Area
                  label="Invoice notes"
                  value={details.notes}
                  onChange={(v) => update("notes", v)}
                />
                <Area
                  label="Payment terms"
                  value={details.terms}
                  onChange={(v) => update("terms", v)}
                />
              </div>
            </fieldset>
          </section>
          <section className="panel">
            <div className="list-title">
              <h2>Project items</h2>
              <span className="muted small-text">
                Full quotation quantities and prices
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Days / basis</th>
                    <th>Amount after discount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.document.lines.map((line, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{line.name}</strong>
                        <small>{line.description}</small>
                        {line.components.length > 0 && (
                          <ul>
                            {line.components.map((part, j) => (
                              <li key={j} className="small-text muted">
                                {part.name} — {part.quantity} {part.unit}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        {line.quantity} {line.unit}
                      </td>
                      <td>
                        {line.sellingBasis === "DAILY"
                          ? `${line.duration} days`
                          : "Once"}
                      </td>
                      <td className="amount">{rupiah(line.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {!!siblings.length && (
            <section className="panel padded">
              <h2>Related invoices</h2>
              {siblings.map((other) => (
                <div className="summary-row" key={other.id}>
                  <Link href={`/invoice/${other.id}`} className="table-link">
                    {other.number} · {invoiceKinds[other.kind]}
                  </Link>
                  <span>{invoiceStatuses[other.status]}</span>
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="panel padded quote-summary" id="invoice-review">
          <p className="eyebrow">{invoiceKinds[invoice.kind].toUpperCase()}</p>
          <div className="summary-row">
            <span>Full project total</span>
            <strong>{rupiah(invoice.document.total)}</strong>
          </div>
          <div className="summary-row">
            <span>Invoice net amount</span>
            <strong>{rupiah(amount.net)}</strong>
          </div>
          {invoice.document.ppnEnabled && (
            <div className="summary-row">
              <span>Invoice VAT (PPN)</span>
              <strong>{rupiah(amount.ppn)}</strong>
            </div>
          )}
          {invoice.document.pphEnabled && (
            <div className="summary-row">
              <span>Invoice income tax (PPh)</span>
              <strong>{rupiah(amount.pph)}</strong>
            </div>
          )}
          <div className="grand-total">
            <span>
              {invoice.status === "VOID"
                ? "Voided amount"
                : "Amount on this invoice"}
            </span>
            <strong>{rupiah(amount.total)}</strong>
          </div>
          <p className="muted small-text">
            Invoice status tracks document issuance, not payment receipt. No
            email is sent automatically.
          </p>
          <div className="stack summary-actions">
            {editable && (
              <>
                <button
                  className="button primary"
                  onClick={save}
                  disabled={pending || !dirty}
                >
                  Save invoice
                </button>
                <button
                  className="button"
                  onClick={() => changeStatus("ISSUED")}
                  disabled={dirty || pending}
                >
                  Issue invoice
                </button>
              </>
            )}
            {invoice.status !== "VOID" && (
              <button
                className="button danger"
                onClick={() => changeStatus("VOID")}
                disabled={dirty || pending}
              >
                Void invoice
              </button>
            )}
            {invoice.kind === "DEPOSIT" &&
              invoice.status !== "VOID" &&
              !siblings.some(
                (s) => s.kind === "FINAL" && s.status !== "VOID",
              ) && (
                <Link
                  className="button"
                  href={`/invoice/new?quotation=${invoice.quotationId}`}
                >
                  Create final installment
                </Link>
              )}
            {dirty && (
              <p className="muted small-text">
                Save your changes before issuing. Print uses the last saved
                version.
              </p>
            )}
          </div>
        </aside>
      </div>
      <DocumentActionBar
        total={amount.total}
        label={dirty ? "Unsaved · invoice amount" : "Invoice amount"}
        reviewId="invoice-review"
        onSave={editable ? save : undefined}
        disabled={pending || !dirty}
        saveLabel={pending ? "Saving…" : "Save invoice"}
      />
    </>
  );
}
