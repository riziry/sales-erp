import {
  defaultProfile,
  newLine,
  newQuotation,
  type Item,
  type Quotation,
  type RecordOf,
} from "../lib/domain/model";
export const item: RecordOf<Item> = {
  id: "11111111-1111-4111-8111-111111111111",
  sku: "LED-001",
  name: "PAR LED 54 RGBW",
  category: "Lighting",
  subcategory: "PAR",
  description: "Stage light",
  unit: "unit",
  sellingPrice: "350000",
  sellingBasis: "DAILY",
  internalCost: "150000",
  costBasis: "DAILY",
  notes: "",
  active: true,
  externalInventoryItemId: null,
};
export function quote(): Quotation {
  const q = newQuotation(structuredClone(defaultProfile));
  q.customer.name = "PT Event Nusantara";
  q.event = "Annual Gathering";
  q.date = "2026-09-25";
  q.validUntil = "2026-10-09";
  const line = newLine(item);
  line.quantity = "20";
  line.duration = "2";
  line.cost = {
    source: "VENDOR",
    amount: "175000",
    basis: "DAILY",
    unit: "unit",
    vendorId: "22222222-2222-4222-8222-222222222222",
    vendorPriceId: "33333333-3333-4333-8333-333333333333",
    vendorName: "Vendor B PRIVATE",
  };
  q.lines = [line];
  return q;
}
