"use client";
import type { SalesIdentity } from "@/lib/domain/account";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Area,
  BasisField,
  Check,
  DiscountField,
  Field,
  Notice,
} from "./fields";
import { Picker, SearchSelect as Select } from "./search-picker";
import {
  Copy,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Trash2,
  Undo2,
  CheckCircle2,
  Circle,
  LockKeyhole,
} from "lucide-react";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { useUI } from "./ui-provider";
import { duplicateQuotationAction } from "@/lib/server/sales-actions";
import DocumentActionBar from "./document-action-bar";
import CostEditor from "./cost-editor";
import { quotationAction, statusAction } from "@/lib/server/actions";
import { calculate, rupiah } from "@/lib/domain/calculate";
import {
  newLine,
  packageLine,
  quotationSchema,
  resetBank,
  selectTax,
  statusNames,
  type Catalog,
  type Component,
  type Line,
  type Quotation,
  type Status,
} from "@/lib/domain/model";
type Saved = {
  id: string;
  version: number;
  status: Status;
  number: string;
  revision: number;
  latestRevision: number;
  history: { id: string; revision: number; status: Status }[];
};
export default function QuotationEditor({
  initial,
  catalog,
  saved,
  currentSales,
}: {
  initial: Quotation;
  catalog: Catalog;
  saved?: Saved;
  currentSales?: SalesIdentity | null;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [removed, setRemoved] = useState<{ line: Line; index: number } | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const historical = !!saved && saved.revision !== saved.latestRevision;
  const { notify } = useUI();
  useUnsavedChanges(dirty, "quotation");
  function change(next: Quotation) {
    setData(next);
    setDirty(true);
    setMessage("");
  }
  const update = <K extends keyof Quotation>(key: K, value: Quotation[K]) =>
    change({ ...data, [key]: value });
  const lineChange = (id: string, patch: Partial<Line>) =>
    update(
      "lines",
      data.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const componentChange = (line: Line, id: string, patch: Partial<Component>) =>
    lineChange(line.id, {
      components: line.components.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    });
  let totals: ReturnType<typeof calculate> | null = null;
  let calculationError = "";
  try {
    totals = calculate(data);
  } catch (e) {
    calculationError =
      e instanceof Error && !e.message.includes("DecimalError")
        ? e.message
        : "Complete the numeric fields in this quotation.";
  }
  function move(index: number, step: number) {
    const lines = [...data.lines];
    const target = index + step;
    if (target < 0 || target >= lines.length) return;
    [lines[index], lines[target]] = [lines[target], lines[index]];
    update("lines", lines);
  }
  const itemOptions = catalog.items
    .filter((item) => item.active)
    .map((item) => ({
      id: item.id,
      label: item.name,
      description: `${item.sku} · ${item.category || "Uncategorized"} · ${item.unit}`,
      category: item.category || "Uncategorized",
      keywords: `${item.subcategory} ${item.description}`,
      detail: `${rupiah(item.sellingPrice)} / ${item.sellingBasis === "DAILY" ? "day" : "event"}`,
    }));
  function save() {
    setError("");
    const parsed = quotationSchema.safeParse(data);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => {
            const path = i.path
              .map((part) =>
                typeof part === "number"
                  ? String(part + 1)
                  : String(part).replace(/([A-Z])/g, " $1"),
              )
              .join(" → ");
            return `${path.charAt(0).toUpperCase() + path.slice(1)}: ${i.message}`;
          })
          .join("\n"),
      );
      setCollapsed([]);
      document
        .getElementById("editor-feedback")
        ?.scrollIntoView({ block: "center" });
      return;
    }
    start(async () => {
      const result = await quotationAction({
        id: saved?.id ?? null,
        version: saved?.version ?? null,
        data,
      });
      if (!result.ok) setError(result.error);
      else {
        setDirty(false);
        setMessage("Quotation saved successfully.");
        notify("Quotation saved successfully.");
        router.push(`/quotation/${result.id}`);
        router.refresh();
      }
    });
  }
  function setStatus(status: Status) {
    if (!saved) return;
    start(async () => {
      const result = await statusAction(saved.id, saved.version, status);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }
  return (
    <>
      <Link href="/quotation" className="back-link">
        ← All quotations
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUOTATION BUILDER</p>
          <h1>
            {saved ? saved.number : "New quotation"}
            {saved && <span className="revision">R{saved.revision}</span>}
          </h1>
          <p className="muted">
            {data.event || "Build a quotation for your event."}
          </p>
        </div>
        <div className="heading-actions">
          {saved && (
            <>
              <span className={`badge status-${saved.status.toLowerCase()}`}>
                {statusNames[saved.status]}
              </span>
              <Link
                className="button"
                target="_blank"
                href={`/quotation/${saved.id}/print`}
              >
                Print ↗
              </Link>
            </>
          )}
          {saved && (
            <button
              className="button"
              disabled={dirty || pending}
              onClick={() =>
                start(async () => {
                  const result = await duplicateQuotationAction(
                    saved.id,
                    saved.version,
                  );
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  notify("Duplicated as a new draft");
                  router.push(`/quotation/${result.id}`);
                })
              }
            >
              <Copy size={16} />
              Duplicate
            </button>
          )}
          {saved && !historical && saved.status !== "REJECTED" && (
            <Link
              className={`button ${dirty || pending || !data.lines.length ? "disabled-link" : ""}`}
              aria-disabled={dirty || pending || !data.lines.length}
              onClick={(event) => {
                if (dirty || pending || !data.lines.length)
                  event.preventDefault();
              }}
              href={`/invoice/new?quotation=${saved.id}`}
            >
              Create invoice
            </Link>
          )}
          {!historical && (
            <button
              className="button primary"
              disabled={pending}
              onClick={save}
            >
              {pending
                ? "Saving…"
                : saved && saved.status !== "DRAFT"
                  ? "Save new revision"
                  : "Save draft"}
            </button>
          )}
        </div>
      </div>
      {saved && (
        <div className="revision-bar">
          <span>Revision history</span>
          {saved.history.map((h) => (
            <Link
              className={h.id === saved.id ? "selected" : ""}
              href={`/quotation/${h.id}`}
              key={h.id}
            >
              R{h.revision} · {statusNames[h.status]}
            </Link>
          ))}
        </div>
      )}
      {historical && (
        <p className="notice info">
          This is an archived version. Open the latest revision to edit the
          quotation.
        </p>
      )}
      {saved && saved.status !== "DRAFT" && !historical && (
        <p className="notice info">
          Changes will be saved as a new draft revision. Document R
          {saved.revision} is preserved.
        </p>
      )}
      <div id="editor-feedback">
        <Notice text={error} />
        <Notice text={message} success />
      </div>
      <nav className="editor-sections" aria-label="Quotation sections">
        <a href="#quote-details">
          <span>01</span> Details
        </a>
        <a href="#quote-items">
          <span>02</span> Items & packages
        </a>
        <a href="#quote-taxes">
          <span>03</span> Discounts & taxes
        </a>
        <a href="#quote-terms">
          <span>04</span> Notes & terms
        </a>
        <a href="#quote-review">
          <span>05</span> Review
        </a>
        <span className={`save-indicator ${dirty ? "unsaved" : ""}`}>
          {dirty
            ? "Unsaved changes"
            : saved
              ? "All changes saved"
              : "New draft"}
        </span>
      </nav>
      <div className="editor-layout">
        <fieldset
          className="editor-body stack"
          disabled={historical || pending}
        >
          <section className="panel padded" id="quote-details">
            <div className="section-heading">
              <h2>
                <span className="step">01</span> Quotation details
              </h2>
              <span className="muted small-text">IDR · Jakarta</span>
            </div>
            <p className="section-description">
              Choose a customer or enter their details below. Fields marked *
              are required.
            </p>
            <div className="form-grid">
              <Select
                label="Select customer"
                value={data.customerId || ""}
                onChange={(v) => {
                  const c = catalog.customers.find((c) => c.id === v);
                  if (c) {
                    const { id, ...customer } = c;
                    change({ ...data, customerId: id, customer });
                  } else update("customerId", null);
                }}
              >
                <option value="">Custom customer</option>
                {catalog.customers
                  .filter((c) => c.active || c.id === data.customerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              <Field
                label="Customer / company name"
                value={data.customer.name}
                onChange={(v) =>
                  update("customer", { ...data.customer, name: v })
                }
                required
              />
              <Field
                label="Customer contact"
                value={data.customer.contact}
                onChange={(v) =>
                  update("customer", { ...data.customer, contact: v })
                }
              />
              <Field
                label="Customer email"
                value={data.customer.email}
                onChange={(v) =>
                  update("customer", { ...data.customer, email: v })
                }
              />
              <Area
                label="Customer address"
                value={data.customer.address}
                onChange={(v) =>
                  update("customer", { ...data.customer, address: v })
                }
              />
              <Field
                label="Event / project"
                value={data.event}
                onChange={(v) => update("event", v)}
                required
              />
              <Field
                label="Event location"
                value={data.location}
                onChange={(v) => update("location", v)}
              />
              <Field
                label="Event date"
                type="date"
                value={data.eventDate}
                onChange={(v) => update("eventDate", v)}
              />
              <Field
                label="Quotation date"
                type="date"
                value={data.date}
                onChange={(v) => update("date", v)}
              />
              <Field
                label="Valid until"
                type="date"
                value={data.validUntil}
                onChange={(v) => update("validUntil", v)}
              />
            </div>
          </section>
          <section className="panel padded" id="quote-items">
            <div className="section-heading">
              <h2>
                <span className="step">02</span> Items & packages
              </h2>
              <span className="count-pill">{data.lines.length} lines</span>
            </div>
            <div className="add-lines">
              <Picker
                label="Add catalog item"
                options={itemOptions}
                placeholder="Search items or SKU…"
                limit={Math.max(0, 200 - data.lines.length)}
                onMany={(ids) =>
                  update("lines", [
                    ...data.lines,
                    ...ids.map((id) =>
                      newLine(catalog.items.find((item) => item.id === id)!),
                    ),
                  ])
                }
              />
              <Picker
                label="Add package"
                placeholder="Search packages…"
                options={catalog.packages
                  .filter((p) => p.active)
                  .map((p) => ({
                    id: p.id,
                    label: p.name,
                    description: `${p.components.length} components · ${p.description}`,
                    detail: rupiah(p.sellingPrice),
                  }))}
                onChange={(id) => {
                  const p = catalog.packages.find((p) => p.id === id);
                  if (p && data.lines.length < 200)
                    update("lines", [
                      ...data.lines,
                      packageLine(p, catalog.items),
                    ]);
                }}
              />
              <button
                className="button"
                disabled={data.lines.length >= 200}
                onClick={() => update("lines", [...data.lines, newLine()])}
              >
                <Plus size={16} aria-hidden="true" /> Custom item
              </button>
            </div>
            <p className="section-description">
              Search by name or SKU. Select multiple items at once, then tailor
              names, prices, and costs below.
            </p>
            {removed && (
              <div className="undo-notice" role="status">
                <span>Removed {removed.line.name || "item"}.</span>
                <button
                  className="button small"
                  disabled={data.lines.length >= 200}
                  onClick={() => {
                    const lines = [...data.lines];
                    lines.splice(
                      Math.min(removed.index, lines.length),
                      0,
                      removed.line,
                    );
                    update("lines", lines);
                    setRemoved(null);
                  }}
                >
                  <Undo2 size={15} />
                  Undo
                </button>
              </div>
            )}
            {!!data.lines.length && (
              <div className="line-display-actions">
                <button
                  className="button small"
                  onClick={() =>
                    setCollapsed(
                      data.lines.every((line) => collapsed.includes(line.id))
                        ? []
                        : data.lines.map((line) => line.id),
                    )
                  }
                >
                  {data.lines.every((line) => collapsed.includes(line.id))
                    ? "Expand all items"
                    : "Collapse all items"}
                </button>
                <span className="muted small-text">
                  {data.lines.length} / 200 lines
                </span>
              </div>
            )}
            {!data.lines.length && (
              <div className="empty-state compact">
                <span className="empty-icon">▦</span>
                <h3>What does this event need?</h3>
                <p>
                  Add items, services, or packages to start building your
                  quotation.
                </p>
              </div>
            )}
            {data.lines.map((line, index) => (
              <article
                className="quote-line"
                key={line.id}
                aria-label={`Quotation line ${index + 1}: ${line.name || "Untitled item"}`}
              >
                <div className="line-heading">
                  <button
                    type="button"
                    className="line-toggle"
                    aria-expanded={!collapsed.includes(line.id)}
                    aria-controls={`line-${line.id}`}
                    onClick={() =>
                      setCollapsed((ids) =>
                        ids.includes(line.id)
                          ? ids.filter((id) => id !== line.id)
                          : [...ids, line.id],
                      )
                    }
                  >
                    <span className="line-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="line-label">
                      {line.name || "Untitled item"}
                      <small>
                        {line.type === "PACKAGE"
                          ? `${line.components.length} components`
                          : line.unit}{" "}
                        · Qty {line.quantity} ·{" "}
                        {totals ? rupiah(totals.lines[index].net) : "—"}
                      </small>
                    </span>
                    {totals?.lines[index].cost === null && (
                      <span className="badge amber">Cost missing</span>
                    )}
                    {collapsed.includes(line.id) ? (
                      <ChevronDown size={17} />
                    ) : (
                      <ChevronUp size={17} />
                    )}
                  </button>
                  <div className="line-tools">
                    <button
                      className="icon-button"
                      aria-label="Move item up"
                      disabled={!index}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move item down"
                      disabled={index === data.lines.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label="Remove item"
                      onClick={() => {
                        setRemoved({ line, index });
                        update(
                          "lines",
                          data.lines.filter((l) => l.id !== line.id),
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div
                  id={`line-${line.id}`}
                  hidden={collapsed.includes(line.id)}
                  className="line-content"
                >
                  <div className="form-grid">
                    <Field
                      label={
                        line.type === "PACKAGE" ? "Package name" : "Item name"
                      }
                      value={line.name}
                      onChange={(v) => lineChange(line.id, { name: v })}
                    />
                    <Area
                      label="Item description"
                      value={line.description}
                      onChange={(v) => lineChange(line.id, { description: v })}
                    />
                  </div>
                  <div className="form-grid four">
                    <Field
                      label="Qty"
                      type="number"
                      value={line.quantity}
                      onChange={(v) => lineChange(line.id, { quantity: v })}
                    />
                    <Field
                      label="Unit"
                      value={line.unit}
                      onChange={(v) =>
                        lineChange(line.id, {
                          unit: v,
                          cost: {
                            ...line.cost,
                            unit: v,
                            source: "CUSTOM",
                            vendorId: null,
                            vendorPriceId: null,
                            vendorName: "",
                          },
                        })
                      }
                    />
                    <Field
                      label="Duration (days)"
                      type="number"
                      value={line.duration}
                      onChange={(v) => lineChange(line.id, { duration: v })}
                    />
                    <Field
                      label="Selling price per unit"
                      currency
                      type="number"
                      value={line.sellingPrice}
                      onChange={(v) => lineChange(line.id, { sellingPrice: v })}
                    />
                  </div>
                  <div className="form-grid">
                    <BasisField
                      label="Selling price basis"
                      value={line.sellingBasis}
                      onChange={(v) => lineChange(line.id, { sellingBasis: v })}
                    />
                    <DiscountField
                      label="Item discount"
                      value={line.discount}
                      onChange={(v) => lineChange(line.id, { discount: v })}
                    />
                  </div>
                  {line.type === "ITEM" ? (
                    <CostEditor
                      part={line}
                      catalog={catalog}
                      onChange={(cost) => lineChange(line.id, { cost })}
                    />
                  ) : (
                    <div className="package-components">
                      <div className="section-heading">
                        <h3>
                          Package contents{" "}
                          <span className="muted">/ qty per package</span>
                        </h3>
                      </div>
                      <p className="small-text muted">
                        Set the cost duration for each component. Customers see
                        total component quantities without component prices.
                      </p>
                      {line.components.map((part, ci) => (
                        <div className="package-part" key={part.id}>
                          <div className="section-heading">
                            <strong>Component {ci + 1}</strong>
                            <button
                              className="button small danger"
                              onClick={() =>
                                lineChange(line.id, {
                                  components: line.components.filter(
                                    (c) => c.id !== part.id,
                                  ),
                                })
                              }
                            >
                              Remove component
                            </button>
                          </div>
                          <div className="form-grid">
                            <Field
                              label="Component name"
                              value={part.name}
                              onChange={(v) =>
                                componentChange(line, part.id, { name: v })
                              }
                            />
                            <Field
                              label="Component description"
                              value={part.description}
                              onChange={(v) =>
                                componentChange(line, part.id, {
                                  description: v,
                                })
                              }
                            />
                          </div>
                          <div className="form-grid three">
                            <Field
                              label="Qty per package"
                              type="number"
                              value={part.quantity}
                              onChange={(v) =>
                                componentChange(line, part.id, { quantity: v })
                              }
                            />
                            <Field
                              label="Component unit"
                              value={part.unit}
                              onChange={(v) =>
                                componentChange(line, part.id, {
                                  unit: v,
                                  cost: {
                                    ...part.cost,
                                    unit: v,
                                    source: "CUSTOM",
                                    vendorId: null,
                                    vendorPriceId: null,
                                    vendorName: "",
                                  },
                                })
                              }
                            />
                            <Field
                              label="Cost duration (days)"
                              type="number"
                              value={part.duration}
                              onChange={(v) =>
                                componentChange(line, part.id, { duration: v })
                              }
                            />
                          </div>
                          <CostEditor
                            part={part}
                            catalog={catalog}
                            onChange={(cost) =>
                              componentChange(line, part.id, { cost })
                            }
                          />
                        </div>
                      ))}
                      <div className="add-lines">
                        <Picker
                          label="Add catalog component"
                          placeholder="Search components…"
                          options={itemOptions}
                          limit={Math.max(0, 100 - line.components.length)}
                          onMany={(ids) =>
                            lineChange(line.id, {
                              components: [
                                ...line.components,
                                ...ids.map((id) =>
                                  newLine(
                                    catalog.items.find(
                                      (item) => item.id === id,
                                    )!,
                                  ),
                                ),
                              ],
                            })
                          }
                        />
                        <button
                          className="button small"
                          onClick={() =>
                            lineChange(line.id, {
                              components: [...line.components, newLine()],
                            })
                          }
                        >
                          <Plus size={16} aria-hidden="true" /> Custom component
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="line-total">
                    <span>Subtotal after discount</span>
                    <strong>
                      {totals ? rupiah(totals.lines[index].net) : "—"}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <section className="panel padded" id="quote-taxes">
            <h2>
              <span className="step">03</span> Discounts, taxes & bank account
            </h2>
            <DiscountField
              label="Overall discount"
              value={data.discount}
              onChange={(v) => update("discount", v)}
            />
            <div className="form-grid tax-grid">
              <div>
                <Check
                  label="Apply VAT (PPN)"
                  checked={data.ppnEnabled}
                  onChange={(v) => change(selectTax(data, v))}
                />
                <Field
                  label="VAT (PPN, %)"
                  type="number"
                  value={data.ppnRate}
                  onChange={(v) => update("ppnRate", v)}
                />
              </div>
              <div>
                <Check
                  label="Apply income tax (PPh)"
                  checked={data.pphEnabled}
                  onChange={(v) => update("pphEnabled", v)}
                />
                <Field
                  label="Income tax (PPh, %)"
                  type="number"
                  value={data.pphRate}
                  onChange={(v) => update("pphRate", v)}
                />
              </div>
            </div>
            <p className="small-text muted">
              VAT (PPN) and income tax (PPh) are added to the subtotal after all
              discounts.
            </p>
            <div className="inset">
              <div className="section-heading">
                <h3>Payment bank account</h3>
                <span className="badge">
                  {data.bankMode === "MANUAL"
                    ? "Manual"
                    : data.ppnEnabled
                      ? "Tax · automatic"
                      : "Non-tax · automatic"}
                </span>
              </div>
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
                    value={data.bank[key]}
                    onChange={(v) =>
                      change({
                        ...data,
                        bankMode: "MANUAL",
                        bank: { ...data.bank, [key]: v },
                      })
                    }
                  />
                ))}
              </div>
              <button
                className="button small"
                onClick={() => change(resetBank(data))}
              >
                Reset to default bank account
              </button>
              <p className="small-text muted">
                Defaults use the profile saved when this quotation was created.
                A manually edited bank account will not change when tax options
                change.
              </p>
            </div>
          </section>
          <section className="panel padded sales-contact-panel">
            <h2>Sales contact & signature</h2>
            <p className="section-description">
              Saved with this quotation and copied to its invoices.
            </p>
            {data.sales ? (
              <p>
                <strong>{data.sales.name}</strong>
                <br />
                {data.sales.phone}
                {data.sales.signature
                  ? " · Signature included"
                  : " · No signature uploaded"}
              </p>
            ) : (
              <p className="muted">
                No sales contact saved on this document yet.
              </p>
            )}
            <div className="form-actions">
              {currentSales && (
                <button
                  type="button"
                  className="button"
                  onClick={() => update("sales", structuredClone(currentSales))}
                >
                  Use my current account details
                </button>
              )}
              <Link href="/account" className="button">
                Manage my account
              </Link>
            </div>
          </section>
          <section className="panel padded" id="quote-terms">
            <h2>
              <span className="step">04</span> Notes & terms
            </h2>
            <div className="stack">
              <Area
                label="Quotation notes"
                value={data.notes}
                onChange={(v) => update("notes", v)}
              />
              <Area
                label="Quotation terms"
                value={data.terms}
                onChange={(v) => update("terms", v)}
              />
            </div>
          </section>
        </fieldset>
        <aside className="quote-summary" id="quote-review">
          <section className="panel padded sticky-summary">
            <p className="eyebrow">QUOTATION SUMMARY</p>
            <h2>Ready when you are.</h2>
            <div className="review-checklist">
              {[
                {
                  done: !!data.customer.name.trim() && !!data.event.trim(),
                  label: "Customer & event",
                  href: "#quote-details",
                },
                {
                  done: !!data.lines.length,
                  label: "Items added",
                  href: "#quote-items",
                },
                {
                  done: !!totals?.complete && !!data.lines.length,
                  label: "All costs complete",
                  href: "#quote-items",
                },
              ].map((check) => (
                <a
                  key={check.label}
                  href={check.href}
                  className={check.done ? "complete" : ""}
                >
                  {check.done ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                  {check.label}
                </a>
              ))}
            </div>
            {totals ? (
              <>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{rupiah(totals.gross)}</strong>
                </div>
                <div className="summary-row">
                  <span>Item discount</span>
                  <span>− {rupiah(totals.lineDiscount)}</span>
                </div>
                <div className="summary-row">
                  <span>Overall discount</span>
                  <span>− {rupiah(totals.overallDiscount)}</span>
                </div>
                <div className="summary-row divider">
                  <span>Net revenue</span>
                  <strong>{rupiah(totals.net)}</strong>
                </div>
                {data.ppnEnabled && (
                  <div className="summary-row">
                    <span>VAT (PPN) {data.ppnRate}%</span>
                    <span>+ {rupiah(totals.ppn)}</span>
                  </div>
                )}
                {data.pphEnabled && (
                  <div className="summary-row">
                    <span>Income tax (PPh) {data.pphRate}%</span>
                    <span>+ {rupiah(totals.pph)}</span>
                  </div>
                )}
                <div className="grand-total">
                  <span>Total quotation</span>
                  <strong>{rupiah(totals.total)}</strong>
                </div>
                <div className="profit-box">
                  <p className="eyebrow">
                    <LockKeyhole size={13} /> INTERNAL COSTING
                  </p>
                  <div className="summary-row">
                    <span>Total cost</span>
                    <strong>{rupiah(totals.cost)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Gross profit</span>
                    <strong>{rupiah(totals.profit)}</strong>
                  </div>
                  <small>
                    Cost and profit are not included in customer documents.
                  </small>
                </div>
              </>
            ) : (
              <Notice text={calculationError} />
            )}
            {totals && !totals.complete && data.lines.length > 0 && (
              <p className="notice info">
                Some costs are missing. You can save a draft now; complete each
                cost before marking it as sent. Enter 0 for a confirmed zero
                cost.
              </p>
            )}
            {!historical && (
              <div className="stack summary-actions">
                <button
                  className="button primary"
                  disabled={pending}
                  onClick={save}
                >
                  {saved && saved.status !== "DRAFT"
                    ? "Save new revision"
                    : "Save draft"}
                </button>
                {saved?.status === "DRAFT" && (
                  <button
                    className="button"
                    disabled={
                      pending ||
                      dirty ||
                      !totals?.complete ||
                      !data.lines.length
                    }
                    onClick={() => setStatus("SENT")}
                  >
                    Mark as sent
                  </button>
                )}
                {saved?.status === "SENT" && (
                  <>
                    <button
                      className="button"
                      disabled={pending || dirty}
                      onClick={() => setStatus("APPROVED")}
                    >
                      Mark as approved
                    </button>
                    <button
                      className="button danger"
                      disabled={pending || dirty}
                      onClick={() => setStatus("REJECTED")}
                    >
                      Mark as rejected
                    </button>
                  </>
                )}
                {dirty && (
                  <small className="muted">
                    You have unsaved changes. Printing uses the last saved
                    version.
                  </small>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
      <DocumentActionBar
        total={totals?.total ?? null}
        label={dirty ? "Unsaved · quotation total" : "Quotation total"}
        reviewId="quote-review"
        onSave={historical ? undefined : save}
        disabled={pending}
        saveLabel={
          pending
            ? "Saving…"
            : saved && saved.status !== "DRAFT"
              ? "Save revision"
              : "Save draft"
        }
      />
    </>
  );
}
