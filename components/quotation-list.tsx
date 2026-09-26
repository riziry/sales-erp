"use client";
import { SelectControl } from "./ui/select";
import Link from "next/link";
import { useState } from "react";
import {
  Search,
  Plus,
  ArrowUpRight,
  FileText,
  CircleCheck,
  Send,
  PencilLine,
} from "lucide-react";
import { statusNames, type Status } from "@/lib/domain/model";
import { rupiah } from "@/lib/domain/calculate";
import { Picker } from "./search-picker";
import Pagination from "./pagination";
import { WelcomeCard } from "./tutorial";
export type QuotationRow = {
  id: string;
  number: string;
  revision: number;
  status: Status;
  event: string;
  customer: string;
  date: string;
  total: string;
};
export default function QuotationList({
  rows,
  initial,
}: {
  rows: QuotationRow[];
  initial: { q?: string; customer?: string; status?: string };
}) {
  const [query, setQuery] = useState(initial.q || "");
  const [status, setStatus] = useState(initial.status || "");
  const [customer, setCustomer] = useState(initial.customer || "");
  const [page, setPage] = useState(0);
  const filtered = rows.filter(
    (row) =>
      (!status || row.status === status) &&
      (!customer || row.customer === customer) &&
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .every((word) =>
          `${row.number} ${row.event} ${row.customer}`
            .toLowerCase()
            .includes(word),
        ),
  );
  const customers = [...new Set(rows.map((row) => row.customer))].sort();
  function reset() {
    setQuery("");
    setStatus("");
    setCustomer("");
    setPage(0);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR COMMERCIAL WORKSPACE</p>
          <h1>Quotations</h1>
          <p className="muted">
            A clear view of every event, from first draft to approval.
          </p>
        </div>
        <Link href="/quotation/new" className="button primary">
          <Plus size={18} />
          Create quotation
        </Link>
      </div>
      <WelcomeCard />
      <div className="overview-grid">
        {[
          { label: "All quotations", value: "", Icon: FileText },
          { label: "Drafts to finish", value: "DRAFT", Icon: PencilLine },
          { label: "Awaiting response", value: "SENT", Icon: Send },
          { label: "Approved", value: "APPROVED", Icon: CircleCheck },
        ].map(({ label, value, Icon }) => (
          <button
            type="button"
            className={`overview-card ${status === value ? "selected" : ""}`}
            key={label}
            onClick={() => {
              setStatus(value);
              setPage(0);
            }}
            aria-pressed={status === value}
          >
            <span>
              {label}
              <Icon size={18} />
            </span>
            <strong>
              {rows.filter((row) => !value || row.status === value).length}
            </strong>
            <small>
              {value ? "View quotations" : "Latest revisions"}
              <ArrowUpRight size={13} />
            </small>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="list-title">
          <h2>
            All quotations <span className="count-pill">{rows.length}</span>
          </h2>
          <span className="muted small-text">Latest revisions only</span>
        </div>
        <div className="table-toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search quotations"
              placeholder="Search number, customer, or event…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <SelectControl
            label="Quotation status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            choices={[
              { value: "", label: "All statuses" },
              ...Object.entries(statusNames).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Picker
            label="Filter by customer"
            value={customer}
            options={[
              { id: "", label: "All customers" },
              ...customers.map((name) => ({ id: name, label: name })),
            ]}
            onChange={(value) => {
              setCustomer(value);
              setPage(0);
            }}
          />
          {(query || status || customer) && (
            <button className="button small" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table className="record-table" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Quotation / event
                </th>
                <th scope="col" role="columnheader">
                  Customer
                </th>
                <th scope="col" role="columnheader">
                  Date
                </th>
                <th scope="col" role="columnheader">
                  Quotation total
                </th>
                <th scope="col" role="columnheader">
                  Status
                </th>
                <th scope="col" role="columnheader">
                  <span className="sr-only">Open quotation</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filtered.slice(page * 20, (page + 1) * 20).map((row) => (
                <tr role="row" key={row.id}>
                  <td
                    role="cell"
                    data-label="Quotation / event"
                    className="record-primary"
                  >
                    <Link className="table-link" href={`/quotation/${row.id}`}>
                      {row.number}
                      <span className="revision">R{row.revision}</span>
                    </Link>
                    <small>{row.event}</small>
                  </td>
                  <td role="cell" data-label="Customer" className="record-wide">
                    {row.customer}
                  </td>
                  <td role="cell" data-label="Date" className="date-cell">
                    {row.date}
                  </td>
                  <td
                    role="cell"
                    data-label="Quotation total"
                    className="amount record-wide"
                  >
                    {rupiah(row.total)}
                  </td>
                  <td role="cell" data-label="Status">
                    <span
                      className={`badge status-${row.status.toLowerCase()}`}
                    >
                      {statusNames[row.status]}
                    </span>
                  </td>
                  <td role="cell" data-label="" className="record-actions">
                    <Link
                      href={`/quotation/${row.id}`}
                      className="row-arrow"
                      aria-label={`Open ${row.number}`}
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
            <span className="empty-icon">
              <FileText size={26} />
            </span>
            <h3>
              {rows.length
                ? "No quotations match your search"
                : "Your first quotation starts here"}
            </h3>
            <p>
              {rows.length
                ? "Try another keyword or clear your filters."
                : "Add a customer, choose your items, and make it yours."}
            </p>
            {rows.length ? (
              <button className="button" onClick={reset}>
                Clear filters
              </button>
            ) : (
              <Link href="/quotation/new" className="button">
                <Plus size={16} />
                Create quotation
              </Link>
            )}
          </div>
        )}
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </section>
      <div className="hint-card">
        <FileText size={22} />
        <div>
          <strong>Make every quotation your own.</strong>
          <p>
            Names, prices, package contents, and discounts are fully editable.
            Your catalog stays unchanged.
          </p>
        </div>
        <Link href="/help">
          Learn how <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
