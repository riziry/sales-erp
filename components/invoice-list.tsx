"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Receipt, ArrowUpRight } from "lucide-react";
import {
  invoiceKinds,
  invoiceStatuses,
  type InvoiceKind,
  type InvoiceStatus,
} from "@/lib/domain/invoice";
import { rupiah } from "@/lib/domain/calculate";
import Pagination from "./pagination";
export type InvoiceRow = {
  id: string;
  number: string;
  quotationNumber: string;
  customer: string;
  event: string;
  dueDate: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  total: string;
};
export default function InvoiceList({ rows }: { rows: InvoiceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const filtered = rows.filter(
    (row) =>
      (!status || status === row.status) &&
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .every((word) =>
          `${row.number} ${row.quotationNumber} ${row.customer} ${row.event}`
            .toLowerCase()
            .includes(word),
        ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER BILLING</p>
          <h1>Invoices</h1>
          <p className="muted">
            Full payment, down payment, and final installment invoices.
          </p>
        </div>
        <Link className="button primary" href="/invoice/new">
          <Plus size={18} />
          Create invoice
        </Link>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search invoices"
              placeholder="Search invoice, quotation, customer, or event…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Invoice status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(invoiceStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice / quotation</th>
                <th>Customer / event</th>
                <th>Type</th>
                <th>Due date</th>
                <th>Invoice amount</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Open invoice</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 20, (page + 1) * 20).map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="table-link" href={`/invoice/${row.id}`}>
                      {row.number}
                    </Link>
                    <small>{row.quotationNumber}</small>
                  </td>
                  <td>
                    {row.customer}
                    <small>{row.event}</small>
                  </td>
                  <td>{invoiceKinds[row.kind]}</td>
                  <td className="date-cell">{row.dueDate}</td>
                  <td className="amount">{rupiah(row.total)}</td>
                  <td>
                    <span
                      className={`badge status-${row.status.toLowerCase()}`}
                    >
                      {invoiceStatuses[row.status]}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="row-arrow"
                      aria-label={`Open ${row.number}`}
                      href={`/invoice/${row.id}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <Receipt className="empty-icon" size={26} />
            <h3>
              {rows.length
                ? "No invoices match your search"
                : "Create your first invoice"}
            </h3>
            <p>
              Choose a saved quotation, select full or split billing, then
              review and print.
            </p>
            {rows.length ? (
              <button
                className="button"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setPage(0);
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link className="button" href="/invoice/new">
                Create invoice
              </Link>
            )}
          </div>
        )}
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </section>
      <p className="hint-card">
        Issued means the invoice is finalized. Payment collection and receipt
        tracking are not recorded here.
      </p>
    </>
  );
}
