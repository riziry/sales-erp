"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Area, BasisField, Check, Field, Notice } from "./fields";
import { SearchSelect as Select } from "./search-picker";
import Modal from "./modal";
import Pagination from "./pagination";
import { Search } from "lucide-react";
import { masterAction } from "@/lib/server/actions";
import {
  emptyContact,
  type Basis,
  type Catalog,
  type MasterKind,
  type Package,
} from "@/lib/domain/model";
import { rupiah } from "@/lib/domain/calculate";
const titles = {
  items: "Items & services",
  customers: "Customers",
  vendors: "Vendors",
  prices: "Vendor pricing",
  packages: "Production packages",
};
const subtitles = {
  items: "Your commercial catalog, selling prices, and reference costs.",
  customers: "Customer details and contacts for every quotation.",
  vendors: "Production partners and reference pricing.",
  prices: "Compare vendor costs by item and pricing basis.",
  packages: "Build component lists and bundle prices for faster quotations.",
};
type FormData = Record<string, unknown>;
function fresh(kind: MasterKind): FormData {
  if (kind === "items")
    return {
      sku: "",
      name: "",
      category: "",
      subcategory: "",
      description: "",
      unit: "unit",
      sellingPrice: "0",
      sellingBasis: "DAILY",
      internalCost: null,
      costBasis: "DAILY",
      notes: "",
      active: true,
      externalInventoryItemId: null,
    };
  if (kind === "prices")
    return {
      itemId: "",
      vendorId: "",
      price: "",
      unit: "unit",
      basis: "DAILY",
      notes: "",
      active: true,
    };
  if (kind === "packages")
    return {
      name: "",
      description: "",
      sellingPrice: "0",
      sellingBasis: "DAILY",
      components: [],
      active: true,
    };
  return { ...emptyContact };
}
export default function MasterManager({
  kind,
  catalog,
}: {
  kind: MasterKind;
  catalog: Catalog;
}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const rows = catalog[kind] as ({ id: string; active: boolean } & FormData)[];
  const value = (key: string) => String(form?.[key] ?? "");
  const update = (key: string, v: unknown) =>
    setForm((f) => ({ ...f, [key]: v }));
  const itemName = (id: unknown) =>
    catalog.items.find((i) => i.id === id)?.name || "Item";
  const vendorName = (id: unknown) =>
    catalog.vendors.find((i) => i.id === id)?.name || "Vendor";
  const rowName = (r: FormData) =>
    kind === "prices"
      ? `${itemName(r.itemId)} · ${vendorName(r.vendorId)}`
      : String(r.name);
  const shown = rows.filter(
    (r) =>
      (filter === "all" || r.active === (filter === "active")) &&
      `${rowName(r)} ${r.sku || ""} ${r.category || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function edit(row?: FormData & { id: string }) {
    setId(row?.id ?? null);
    setForm(row ? structuredClone(row) : fresh(kind));
    setError("");
  }
  const components = (form?.components || []) as Package["components"];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MASTER DATA</p>
          <h1>{titles[kind]}</h1>
          <p className="muted">{subtitles[kind]}</p>
        </div>
        <button className="button primary" onClick={() => edit()}>
          ＋ Add{" "}
          {kind === "prices"
            ? "price"
            : kind === "items"
              ? "item"
              : kind === "packages"
                ? "package"
                : kind === "vendors"
                  ? "vendor"
                  : "customer"}
        </button>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search records"
              placeholder={`Search ${titles[kind].toLowerCase()}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Filter active status"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
          <span className="muted">{shown.length} records</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{kind === "prices" ? "Item / vendor" : "Name"}</th>
                <th>Detail</th>
                <th>
                  {kind === "items" || kind === "packages"
                    ? "Selling price"
                    : kind === "prices"
                      ? "Vendor price"
                      : "Contact"}
                </th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown
                .slice(
                  Math.min(
                    page,
                    Math.max(0, Math.ceil(shown.length / 20) - 1),
                  ) * 20,
                  (Math.min(
                    page,
                    Math.max(0, Math.ceil(shown.length / 20) - 1),
                  ) +
                    1) *
                    20,
                )
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{rowName(r)}</strong>
                      {r.sku ? <small>{String(r.sku)}</small> : null}
                    </td>
                    <td>
                      {kind === "items"
                        ? String(r.category || "—")
                        : kind === "packages"
                          ? `${(r.components as unknown[]).length} components`
                          : kind === "prices"
                            ? `${String(r.unit)} · ${r.basis === "DAILY" ? "per day" : "once"}`
                            : String(r.email || "—")}
                    </td>
                    <td>
                      {kind === "prices" ? (
                        rupiah(String(r.price))
                      ) : kind === "items" || kind === "packages" ? (
                        <>
                          {rupiah(String(r.sellingPrice))}
                          <small>
                            {r.sellingBasis === "DAILY"
                              ? "Per day"
                              : "Once / event"}
                          </small>
                        </>
                      ) : (
                        String(r.contact || "—")
                      )}
                    </td>
                    <td>
                      <span className={`badge ${r.active ? "green" : ""}`}>
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="button small" onClick={() => edit(r)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <div className="empty-state">
            <span className="empty-icon">◇</span>
            <h3>
              {query || filter !== "active"
                ? "No matching records"
                : `No ${titles[kind].toLowerCase()} yet`}
            </h3>
            <p>
              {query || filter !== "active"
                ? "Try a different search or status filter."
                : "Add your first record to reuse it in quotations."}
            </p>
            <button className="button" onClick={() => edit()}>
              ＋ Add record
            </button>
          </div>
        )}
        <Pagination
          count={shown.length}
          page={Math.min(page, Math.max(0, Math.ceil(shown.length / 20) - 1))}
          onChange={setPage}
        />
      </section>
      {form && (
        <Modal
          title={`${id ? "Edit" : "Add"} ${titles[kind].toLowerCase()}`}
          onClose={() => setForm(null)}
          busy={pending}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              start(async () => {
                const result = await masterAction(kind, id, form);
                if (!result.ok) setError(result.error);
                else {
                  setForm(null);
                  router.refresh();
                }
              });
            }}
          >
            <div className="form-grid">
              {kind !== "prices" && (
                <Field
                  label="Name"
                  value={value("name")}
                  onChange={(v) => update("name", v)}
                  required
                />
              )}
              {kind === "items" && (
                <>
                  <Field
                    label="SKU"
                    value={value("sku")}
                    onChange={(v) => update("sku", v)}
                    required
                  />
                  <Field
                    label="Category"
                    value={value("category")}
                    onChange={(v) => update("category", v)}
                  />
                  <Field
                    label="Subcategory"
                    value={value("subcategory")}
                    onChange={(v) => update("subcategory", v)}
                  />
                  <Field
                    label="Default unit"
                    value={value("unit")}
                    onChange={(v) => update("unit", v)}
                    required
                  />
                  <Field
                    label="Internal reference cost (leave blank if unknown)"
                    type="number"
                    value={value("internalCost")}
                    onChange={(v) => update("internalCost", v || null)}
                  />
                  <BasisField
                    label="Internal cost basis"
                    value={value("costBasis") as Basis}
                    onChange={(v) => update("costBasis", v)}
                  />
                  <Field
                    label="External integration ID (optional)"
                    value={value("externalInventoryItemId")}
                    onChange={(v) =>
                      update("externalInventoryItemId", v || null)
                    }
                  />
                </>
              )}
              {(kind === "items" || kind === "packages") && (
                <>
                  <Field
                    label="Default selling price"
                    type="number"
                    value={value("sellingPrice")}
                    onChange={(v) => update("sellingPrice", v)}
                    required
                  />
                  <BasisField
                    label="Selling price basis"
                    value={value("sellingBasis") as Basis}
                    onChange={(v) => update("sellingBasis", v)}
                  />
                  <Area
                    label="Description"
                    value={value("description")}
                    onChange={(v) => update("description", v)}
                  />
                </>
              )}
              {(kind === "vendors" || kind === "customers") && (
                <>
                  <Field
                    label="Contact / phone"
                    value={value("contact")}
                    onChange={(v) => update("contact", v)}
                  />
                  <Field
                    label="Email"
                    value={value("email")}
                    onChange={(v) => update("email", v)}
                  />
                  <Area
                    label="Address"
                    value={value("address")}
                    onChange={(v) => update("address", v)}
                  />
                </>
              )}
              {kind === "prices" && (
                <>
                  <Select
                    label="Item"
                    value={value("itemId")}
                    onChange={(v) => {
                      update("itemId", v);
                      update(
                        "unit",
                        catalog.items.find((i) => i.id === v)?.unit || "unit",
                      );
                    }}
                  >
                    <option value="">Select item</option>
                    {catalog.items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                        {"sku" in i ? ` · ${i.sku}` : ""}
                        {!i.active ? " (inactive)" : ""}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Vendor"
                    value={value("vendorId")}
                    onChange={(v) => update("vendorId", v)}
                  >
                    <option value="">Select vendor</option>
                    {catalog.vendors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                        {"sku" in i ? ` · ${i.sku}` : ""}
                        {!i.active ? " (inactive)" : ""}
                      </option>
                    ))}
                  </Select>
                  <Field
                    label="Vendor price"
                    type="number"
                    value={value("price")}
                    onChange={(v) => update("price", v)}
                    required
                  />
                  <Field
                    label="Price unit"
                    value={value("unit")}
                    onChange={(v) => update("unit", v)}
                    required
                  />
                  <BasisField
                    label="Price basis"
                    value={value("basis") as Basis}
                    onChange={(v) => update("basis", v)}
                  />
                </>
              )}
              {kind !== "packages" && (
                <Area
                  label="Notes"
                  value={value("notes")}
                  onChange={(v) => update("notes", v)}
                />
              )}
            </div>
            {kind === "packages" && (
              <div className="inset">
                <h3>Package contents</h3>
                <p className="muted">
                  Component quantities for one package. Select cost sources when
                  creating a quotation.
                </p>
                {components.map((part, index) => (
                  <div className="component-template" key={index}>
                    <Select
                      label={`Component ${index + 1}`}
                      value={part.itemId}
                      onChange={(v) =>
                        update(
                          "components",
                          components.map((c, i) =>
                            i === index ? { ...c, itemId: v } : c,
                          ),
                        )
                      }
                    >
                      <option value="">Select item</option>
                      {catalog.items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                          {"sku" in i ? ` · ${i.sku}` : ""}
                          {!i.active ? " (inactive)" : ""}
                        </option>
                      ))}
                    </Select>
                    <Field
                      label="Qty per package"
                      type="number"
                      value={part.quantity}
                      onChange={(v) =>
                        update(
                          "components",
                          components.map((c, i) =>
                            i === index ? { ...c, quantity: v } : c,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="button danger"
                      onClick={() =>
                        update(
                          "components",
                          components.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    update("components", [
                      ...components,
                      { itemId: "", quantity: "1" },
                    ])
                  }
                >
                  ＋ Component
                </button>
              </div>
            )}
            {kind === "items" && id && (
              <div className="inset">
                <h3>Vendor price comparison</h3>
                {catalog.prices
                  .filter((p) => p.itemId === id && p.active)
                  .map((p) => (
                    <div className="summary-row" key={p.id}>
                      <span>
                        {vendorName(p.vendorId)} · {p.unit} /{" "}
                        {p.basis === "DAILY" ? "day" : "event"}
                      </span>
                      <strong>{rupiah(p.price)}</strong>
                    </div>
                  ))}
                {!catalog.prices.some((p) => p.itemId === id && p.active) && (
                  <p className="muted">
                    No vendor prices yet. Add one from Vendor pricing.
                  </p>
                )}
              </div>
            )}
            <Check
              label="Active"
              checked={!!form.active}
              onChange={(v) => update("active", v)}
            />
            <Notice text={error} />
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
