import Image from "next/image";
import { rupiah, type CustomerDocument } from "@/lib/domain/calculate";
import {
  invoiceAmounts,
  invoiceKinds,
  type InvoiceKind,
} from "@/lib/domain/invoice";
export default function CustomerPaper({
  document: doc,
  number,
  revision,
  status,
  invoice,
}: {
  document: CustomerDocument;
  number: string;
  revision?: number;
  status: string;
  invoice?: {
    kind: InvoiceKind;
    date: string;
    dueDate: string;
    quotationNumber: string;
    quotationRevision: number;
  };
}) {
  const amounts = invoice ? invoiceAmounts(doc, invoice.kind) : null;
  return (
    <article className={`paper${invoice ? " invoice-paper" : ""}`}>
      {invoice && status === "VOID" && (
        <p className="document-void">
          VOID — This document is not a payment request.
        </p>
      )}
      <header className="document-header">
        <div className="document-company">
          {doc.company.logo && (
            <Image
              src={doc.company.logo}
              alt={`${doc.company.name} logo`}
              width={144}
              height={56}
              className="document-company-logo"
              unoptimized
              loading="eager"
            />
          )}
          <div className="document-brand">{doc.company.name}</div>
          <p className="preserve">{doc.company.address}</p>
          <p>
            {[doc.company.contact, doc.company.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="document-number">
          <p className="eyebrow">{invoice ? "INVOICE" : "QUOTATION"}</p>
          <h1>{number}</h1>
          <p>
            {invoice ? invoiceKinds[invoice.kind] : `Revision ${revision}`}
            {status === "DRAFT"
              ? " · DRAFT"
              : status === "VOID"
                ? " · VOID"
                : ""}
          </p>
        </div>
      </header>
      <div className="document-info">
        <div>
          <p className="eyebrow">PREPARED FOR</p>
          <h3>{doc.customer.name}</h3>
          <p className="preserve">{doc.customer.address}</p>
          <p>{doc.customer.contact}</p>
          <p>{doc.customer.email}</p>
        </div>
        <dl>
          {invoice && (
            <div>
              <dt>Quotation</dt>
              <dd>
                {invoice.quotationNumber} · R{invoice.quotationRevision}
              </dd>
            </div>
          )}
          <div>
            <dt>Date</dt>
            <dd>{invoice?.date || doc.date}</dd>
          </div>
          <div>
            <dt>{invoice ? "Due date" : "Valid until"}</dt>
            <dd>{invoice?.dueDate || doc.validUntil}</dd>
          </div>
          <div>
            <dt>Event</dt>
            <dd>{doc.event}</dd>
          </div>
          {doc.eventDate && (
            <div>
              <dt>Event date</dt>
              <dd>{doc.eventDate}</dd>
            </div>
          )}
          {doc.location && (
            <div>
              <dt>Location</dt>
              <dd>{doc.location}</dd>
            </div>
          )}
        </dl>
      </div>
      {invoice && invoice.kind !== "FULL" && (
        <p className="document-installment-note">
          Full project breakdown below. This invoice bills{" "}
          {invoiceKinds[invoice.kind].toLowerCase()} of the project total.
        </p>
      )}
      <table className="document-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Duration</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((line, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                <strong>{line.name}</strong>
                <p className="preserve">{line.description}</p>
                {line.components.length > 0 && (
                  <ul className="document-components">
                    {line.components.map((c, ci) => (
                      <li key={ci}>
                        {c.name} — {c.quantity} {c.unit}
                        {c.description && (
                          <span className="component-description">
                            {c.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {line.discountAmount !== "0" && (
                  <small>
                    Discount{" "}
                    {line.discount.type === "PERCENT"
                      ? `${line.discount.value}%`
                      : rupiah(line.discount.value)}
                    : −{rupiah(line.discountAmount)}
                  </small>
                )}
              </td>
              <td>
                {line.quantity}
                <small>{line.unit}</small>
              </td>
              <td>
                {line.sellingBasis === "DAILY"
                  ? `${line.duration} ${line.duration === "1" ? "day" : "days"}`
                  : "Once"}
              </td>
              <td>
                {rupiah(line.sellingPrice)}
                <small>
                  /{line.unit}
                  {line.sellingBasis === "DAILY" ? "/day" : "/event"}
                </small>
              </td>
              <td>{rupiah(line.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className={
          invoice && invoice.kind !== "FULL"
            ? "document-financials split-financials"
            : "document-financials"
        }
      >
        <div className="document-totals">
          <div className="summary-row">
            <span>Subtotal before discounts</span>
            <span>{rupiah(doc.gross)}</span>
          </div>
          <div className="summary-row">
            <span>Item discount</span>
            <span>− {rupiah(doc.lineDiscount)}</span>
          </div>
          <div className="summary-row">
            <span>Overall discount</span>
            <span>− {rupiah(doc.overallDiscount)}</span>
          </div>
          <div className="summary-row">
            <span>Net subtotal</span>
            <span>{rupiah(doc.net)}</span>
          </div>
          {doc.ppnEnabled && (
            <div className="summary-row">
              <span>VAT (PPN) {doc.ppnRate}%</span>
              <span>+ {rupiah(doc.ppn)}</span>
            </div>
          )}
          {doc.pphEnabled && (
            <div className="summary-row">
              <span>Income tax (PPh) {doc.pphRate}%</span>
              <span>+ {rupiah(doc.pph)}</span>
            </div>
          )}
          <div className="summary-row document-total">
            <strong>
              {invoice
                ? invoice.kind === "FULL"
                  ? "Invoice total"
                  : "Full project total"
                : "Quotation total"}
            </strong>
            <strong>{rupiah(doc.total)}</strong>
          </div>
        </div>
        {invoice && invoice.kind !== "FULL" && amounts && (
          <div className="document-totals installment-totals">
            <h3>{invoiceKinds[invoice.kind]}</h3>
            <div className="summary-row">
              <span>Invoice net amount</span>
              <span>{rupiah(amounts.net)}</span>
            </div>
            {doc.ppnEnabled && (
              <div className="summary-row">
                <span>Invoice VAT (PPN)</span>
                <span>{rupiah(amounts.ppn)}</span>
              </div>
            )}
            {doc.pphEnabled && (
              <div className="summary-row">
                <span>Invoice income tax (PPh)</span>
                <span>{rupiah(amounts.pph)}</span>
              </div>
            )}
            <div className="summary-row document-total">
              <strong>Amount due on this invoice</strong>
              <strong>{rupiah(amounts.total)}</strong>
            </div>
            <p className="small-text">
              Installment amounts do not confirm receipt of payment.
            </p>
          </div>
        )}
      </div>
      <section className="document-bottom">
        <div>
          <h3>Payment bank account</h3>
          <p>{doc.bank.bank || "—"}</p>
          <strong>{doc.bank.number}</strong>
          <p>{doc.bank.holder && `Account holder: ${doc.bank.holder}`}</p>
          {invoice && (
            <div className="invoice-signature-inline">
              <SalesSignature sales={doc.sales} />
            </div>
          )}
        </div>
        <div>
          {doc.terms && (
            <>
              <h3>{invoice ? "Payment terms" : "Quotation terms"}</h3>
              <p className="preserve">{doc.terms}</p>
            </>
          )}
          {doc.notes && (
            <>
              <h3>Notes</h3>
              <p className="preserve">{doc.notes}</p>
            </>
          )}
        </div>
      </section>
      {!invoice && (
        <section
          className="document-signatures"
          aria-label="Document signatures"
        >
          <SalesSignature sales={doc.sales} />
          <div className="client-signature">
            <h3>Client approval</h3>
            <div className="signature-space">
              <span>Signature</span>
            </div>
            <p className="client-write-line">
              Name: <span />
            </p>
            <p className="client-write-line">
              Contact: <span />
            </p>
          </div>
        </section>
      )}
      <footer className="document-footer">
        Thank you for your trust.<strong>{doc.company.name}</strong>
      </footer>
    </article>
  );
}

function SalesSignature({
  sales,
}: {
  sales: CustomerDocument["sales"] | undefined;
}) {
  return (
    <div className="sales-signature">
      <h3>Prepared by</h3>
      <div className="signature-space">
        {sales?.signature && (
          <Image
            src={sales.signature}
            alt={`Signature of ${sales.name}`}
            width={180}
            height={64}
            loading="eager"
            unoptimized
          />
        )}
      </div>
      <strong>{sales?.name || "Sales representative"}</strong>
      <p>
        {sales?.phone
          ? `Contact: ${sales.phone}`
          : "Contact: ____________________"}
      </p>
    </div>
  );
}
