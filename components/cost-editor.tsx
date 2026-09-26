"use client";
import { SearchSelect } from "./search-picker";
import { BasisField, Field, Select } from "./fields";
import type { Catalog, Component, Cost } from "@/lib/domain/model";
import { rupiah } from "@/lib/domain/calculate";
export default function CostEditor({
  part,
  catalog,
  onChange,
}: {
  part: Component;
  catalog: Catalog;
  onChange: (v: Cost) => void;
}) {
  const cost = part.cost;
  const item = catalog.items.find((i) => i.id === part.itemId);
  const prices = catalog.prices.filter(
    (p) =>
      p.itemId === part.itemId &&
      p.unit === part.unit &&
      p.active &&
      catalog.vendors.some((v) => v.id === p.vendorId && v.active),
  );
  const clear = { vendorId: null, vendorPriceId: null, vendorName: "" };
  const custom = (patch: Partial<Cost>) =>
    onChange({ ...cost, ...clear, source: "CUSTOM", ...patch });
  return (
    <div className="cost-editor">
      <div className="cost-heading">
        <span>INTERNAL COST</span>
        {cost.amount === null && (
          <span className="badge amber">Incomplete</span>
        )}
      </div>
      <div className="form-grid compact">
        <Select
          label="Cost source"
          value={cost.source}
          onChange={(v) => {
            if (v === "INTERNAL" && item)
              onChange({
                ...cost,
                ...clear,
                source: "INTERNAL",
                amount: item.internalCost,
                basis: item.costBasis,
                unit: item.unit,
              });
            else if (v === "VENDOR")
              onChange({ ...cost, ...clear, source: "VENDOR", amount: null });
            else custom({});
          }}
        >
          <option value="CUSTOM">Custom / manual</option>
          {item && <option value="INTERNAL">Internal / Own</option>}
          {part.itemId && <option value="VENDOR">Vendor</option>}
        </Select>
        {cost.source === "VENDOR" && (
          <SearchSelect
            label="Vendor price"
            value={cost.vendorPriceId || ""}
            onChange={(v) => {
              const p = prices.find((p) => p.id === v);
              if (p)
                onChange({
                  source: "VENDOR",
                  amount: p.price,
                  basis: p.basis,
                  unit: p.unit,
                  vendorId: p.vendorId,
                  vendorPriceId: p.id,
                  vendorName: catalog.vendors.find((i) => i.id === p.vendorId)!
                    .name,
                });
            }}
          >
            <option value="">Select recorded price</option>
            {cost.vendorPriceId &&
              !prices.some((p) => p.id === cost.vendorPriceId) && (
                <option value={cost.vendorPriceId}>
                  {cost.vendorName} · saved price
                </option>
              )}
            {prices.map((p) => (
              <option value={p.id} key={p.id}>
                {catalog.vendors.find((v) => v.id === p.vendorId)?.name} ·{" "}
                {rupiah(p.price)} / {p.unit} /{" "}
                {p.basis === "DAILY" ? "day" : "event"}
                {p.notes ? ` · ${p.notes}` : ""}
              </option>
            ))}
          </SearchSelect>
        )}
        <Field
          label="Cost per unit"
          currency
          type="number"
          value={cost.amount ?? ""}
          placeholder="Unknown"
          onChange={(v) => custom({ amount: v || null })}
        />
        <BasisField
          label="Cost basis"
          value={cost.basis}
          onChange={(v) => custom({ basis: v })}
        />
      </div>
      {cost.source === "VENDOR" && !prices.length && (
        <p className="muted small-text">
          No active vendor prices for unit {part.unit}. Add a vendor price or
          enter a custom cost.
        </p>
      )}
      {cost.source !== "CUSTOM" && (
        <small className="muted">
          Editing the cost amount or basis switches the cost source to Custom.
        </small>
      )}
    </div>
  );
}
