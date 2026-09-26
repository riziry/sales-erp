"use client";
import { SelectControl } from "./ui/select";
import Link from "next/link";
import { useState } from "react";
import { Plus, Receipt, ArrowUpRight } from "lucide-react";
import {
  invoiceKinds,
  invoiceStatuses,
  type InvoiceKind,
  type InvoiceStatus,
} from "@/lib/domain/invoice";
import { rupiah } from "@/lib/domain/calculate";
import ListSearch from "./list-search";
import Decimal from "decimal.js";
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
  const [sort, setSort] = useState("recent");
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
  const ordered = [...filtered].sort((a, b) =>
    sort === "amount"
      ? new Decimal(b.total).comparedTo(a.total)
      : sort === "due"
        ? a.dueDate.localeCompare(b.dueDate)
        : b.number.localeCompare(a.number),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(ordered.length / 20) - 1),
  );
  function reset() {
    setQuery("");
    setStatus("");
    setPage(0);
  }
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
          <ListSearch
            label="Search invoices"
            placeholder="Search invoice, quotation, customer, or event…"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(0);
            }}
          />
          <SelectControl
            label="Invoice status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            choices={[
              { value: "", label: "All statuses" },
              ...Object.entries(invoiceStatuses).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          {(query || status) && (
            <button className="button small" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
        <div className="list-results-bar">
          <p role="status">
            {filtered.length} of {rows.length} invoices
          </p>
          <SelectControl
            label="Sort invoices"
            value={sort}
            onChange={(value) => {
              setSort(value);
              setPage(0);
            }}
            choices={[
              { value: "recent", label: "Newest first" },
              { value: "due", label: "Due date: soonest" },
              { value: "amount", label: "Highest amount" },
            ]}
          />
        </div>
        <div className="table-scroll">
          <table className="record-table" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Invoice / quotation
                </th>
                <th scope="col" role="columnheader">
                  Customer / event
                </th>
                <th scope="col" role="columnheader">
                  Type
                </th>
                <th scope="col" role="columnheader">
                  Due date
                </th>
                <th scope="col" role="columnheader">
                  Invoice amount
                </th>
                <th scope="col" role="columnheader">
                  Status
                </th>
                <th scope="col" role="columnheader">
                  <span className="sr-only">Open invoice</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {ordered
                .slice(currentPage * 20, (currentPage + 1) * 20)
                .map((row) => (
                  <tr role="row" key={row.id}>
                    <td
                      role="cell"
                      data-label="Invoice / quotation"
                      className="record-primary"
                    >
                      <Link className="table-link" href={`/invoice/${row.id}`}>
                        {row.number}
                      </Link>
                      <small>{row.quotationNumber}</small>
                    </td>
                    <td
                      role="cell"
                      data-label="Customer / event"
                      className="record-wide"
                    >
                      {row.customer}
                      <small>{row.event}</small>
                    </td>
                    <td role="cell" data-label="Type">
                      {invoiceKinds[row.kind]}
                    </td>
                    <td role="cell" data-label="Due date" className="date-cell">
                      {row.dueDate}
                    </td>
                    <td
                      role="cell"
                      data-label="Invoice amount"
                      className="amount record-wide"
                    >
                      {rupiah(row.total)}
                    </td>
                    <td role="cell" data-label="Status">
                      <span
                        className={`badge status-${row.status.toLowerCase()}`}
                      >
                        {invoiceStatuses[row.status]}
                      </span>
                    </td>
                    <td role="cell" data-label="" className="record-actions">
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
              {rows.length
                ? "Try another keyword or clear your filters to see more invoices."
                : "Choose a saved quotation, select full or split billing, then review and print."}
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
        <Pagination
          count={filtered.length}
          page={currentPage}
          onChange={setPage}
        />
      </section>
      <p className="hint-card">
        Issued means the invoice is finalized. Payment collection and receipt
        tracking are not recorded here.
      </p>
    </>
  );
}
