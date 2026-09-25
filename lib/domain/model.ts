import { z } from "zod";

const text = z.string().trim().max(10000);
const name = z.string().trim().min(1, "Required").max(250);
export const decimal = z
  .string()
  .regex(
    /^\d{1,12}(\.\d{1,4})?$/,
    "Enter a nonnegative number with up to 4 decimal places",
  );
const positive = decimal.refine(
  (v) => Number(v) > 0,
  "Must be greater than zero",
);
const rate = decimal.refine((v) => Number(v) <= 100, "Maximum 100%");
export const basisSchema = z.enum(["DAILY", "ONE_TIME"]);
export type Basis = z.infer<typeof basisSchema>;
export const bankSchema = z.object({ bank: text, number: text, holder: text });
export const emptyBank = { bank: "", number: "", holder: "" };
export const profileSchema = z.object({
  name,
  address: text,
  contact: text,
  email: text,
  ppnRate: rate,
  pphRate: rate,
  taxBank: bankSchema,
  regularBank: bankSchema,
});
export type Profile = z.infer<typeof profileSchema>;
export const defaultProfile: Profile = {
  name: "YW Production",
  address: "",
  contact: "",
  email: "",
  ppnRate: "11",
  pphRate: "2",
  taxBank: emptyBank,
  regularBank: emptyBank,
};
export const itemSchema = z.object({
  sku: name,
  name,
  category: text,
  subcategory: text,
  description: text,
  unit: name,
  sellingPrice: decimal,
  sellingBasis: basisSchema,
  internalCost: decimal.nullable(),
  costBasis: basisSchema,
  notes: text,
  active: z.boolean(),
  externalInventoryItemId: text.nullable(),
});
export const contactSchema = z.object({
  name,
  contact: text,
  email: text,
  address: text,
  notes: text,
  active: z.boolean(),
});
export const priceSchema = z.object({
  itemId: z.uuid(),
  vendorId: z.uuid(),
  price: decimal,
  unit: name,
  basis: basisSchema,
  notes: text,
  active: z.boolean(),
});
export const packageSchema = z.object({
  name,
  description: text,
  sellingPrice: decimal,
  sellingBasis: basisSchema,
  active: z.boolean(),
  components: z
    .array(z.object({ itemId: z.uuid(), quantity: positive }))
    .min(1, "Add at least one component")
    .max(100),
});
export const masterSchemas = {
  items: itemSchema,
  customers: contactSchema,
  vendors: contactSchema,
  prices: priceSchema,
  packages: packageSchema,
};
export type MasterKind = keyof typeof masterSchemas;
export type Item = z.infer<typeof itemSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type VendorPrice = z.infer<typeof priceSchema>;
export type Package = z.infer<typeof packageSchema>;
export type RecordOf<T> = T & { id: string };
export type Catalog = {
  items: RecordOf<Item>[];
  customers: RecordOf<Contact>[];
  vendors: RecordOf<Contact>[];
  prices: RecordOf<VendorPrice>[];
  packages: RecordOf<Package>[];
};
export const discountSchema = z.object({
  type: z.enum(["PERCENT", "AMOUNT"]),
  value: decimal,
});
export type Discount = z.infer<typeof discountSchema>;
export const costSchema = z.object({
  source: z.enum(["INTERNAL", "VENDOR", "CUSTOM"]),
  amount: decimal.nullable(),
  basis: basisSchema,
  unit: name,
  vendorId: z.uuid().nullable(),
  vendorPriceId: z.uuid().nullable(),
  vendorName: text,
});
export type Cost = z.infer<typeof costSchema>;
export const componentSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid().nullable(),
  name,
  description: text,
  unit: name,
  quantity: positive,
  duration: positive,
  cost: costSchema,
});
export type Component = z.infer<typeof componentSchema>;
export const lineSchema = componentSchema
  .extend({
    type: z.enum(["ITEM", "PACKAGE"]),
    packageId: z.uuid().nullable(),
    sellingPrice: decimal,
    sellingBasis: basisSchema,
    discount: discountSchema,
    components: z.array(componentSchema).max(100),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PACKAGE" && !v.components.length)
      ctx.addIssue({
        code: "custom",
        message: "A package must contain components",
        path: ["components"],
      });
    if (v.type === "ITEM" && v.components.length)
      ctx.addIssue({
        code: "custom",
        message: "An item cannot contain components",
        path: ["components"],
      });
  });
export type Line = z.infer<typeof lineSchema>;
const date = z.iso.date();
export const quotationSchema = z
  .object({
    customerId: z.uuid().nullable(),
    customer: contactSchema,
    company: profileSchema.pick({
      name: true,
      address: true,
      contact: true,
      email: true,
    }),
    event: name,
    location: text,
    eventDate: date.or(z.literal("")),
    date,
    validUntil: date,
    notes: text,
    terms: text,
    lines: z.array(lineSchema).max(200),
    discount: discountSchema,
    ppnEnabled: z.boolean(),
    pphEnabled: z.boolean(),
    ppnRate: rate,
    pphRate: rate,
    bank: bankSchema,
    bankMode: z.enum(["AUTO", "MANUAL"]),
    bankDefaults: z.object({ tax: bankSchema, regular: bankSchema }),
  })
  .superRefine((v, ctx) => {
    if (v.validUntil < v.date)
      ctx.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "The expiry date cannot be before the quotation date",
      });
  });
export type Quotation = z.infer<typeof quotationSchema>;
export type Status = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
export const statusNames: Record<Status, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
export function jakartaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export const emptyContact: Contact = {
  name: "",
  contact: "",
  email: "",
  address: "",
  notes: "",
  active: true,
};
export function newQuotation(profile: Profile): Quotation {
  const today = jakartaDate();
  const expiry = new Date(today + "T00:00:00Z");
  expiry.setUTCDate(expiry.getUTCDate() + 14);
  return {
    customerId: null,
    customer: { ...emptyContact },
    company: {
      name: profile.name,
      address: profile.address,
      contact: profile.contact,
      email: profile.email,
    },
    event: "",
    location: "",
    eventDate: "",
    date: today,
    validUntil: expiry.toISOString().slice(0, 10),
    notes:
      "Apabila telah disepakati mohon ditandatangani dan di kirimkan kembali berupa hard copy/soft copy ke kami",
    terms:
      "Syarat pembayaran adalah DP 50 % dan sisanya 50 % saat acara selesai ( deinstalsi acara )\n\nKerusakan barang yang terjadi karena kesalahan customer menjadi tanggung jawab pemesan / Customer",
    lines: [],
    discount: { type: "PERCENT", value: "0" },
    ppnEnabled: false,
    pphEnabled: false,
    ppnRate: profile.ppnRate,
    pphRate: profile.pphRate,
    bank: structuredClone(profile.regularBank),
    bankMode: "AUTO",
    bankDefaults: {
      tax: structuredClone(profile.taxBank),
      regular: structuredClone(profile.regularBank),
    },
  };
}
export function selectTax(q: Quotation, enabled: boolean): Quotation {
  return {
    ...q,
    ppnEnabled: enabled,
    bank:
      q.bankMode === "AUTO"
        ? structuredClone(enabled ? q.bankDefaults.tax : q.bankDefaults.regular)
        : q.bank,
  };
}
export function resetBank(q: Quotation): Quotation {
  return {
    ...q,
    bankMode: "AUTO",
    bank: structuredClone(
      q.ppnEnabled ? q.bankDefaults.tax : q.bankDefaults.regular,
    ),
  };
}
export function newLine(item?: RecordOf<Item>): Line {
  const unit = item?.unit || "unit";
  return {
    id: crypto.randomUUID(),
    type: "ITEM",
    itemId: item?.id || null,
    packageId: null,
    name: item?.name || "",
    description: item?.description || "",
    unit,
    quantity: "1",
    duration: "1",
    sellingPrice: item?.sellingPrice || "0",
    sellingBasis: item?.sellingBasis || "DAILY",
    discount: { type: "PERCENT", value: "0" },
    cost: {
      source: item ? "INTERNAL" : "CUSTOM",
      amount: item?.internalCost ?? null,
      basis: item?.costBasis || "DAILY",
      unit,
      vendorId: null,
      vendorPriceId: null,
      vendorName: "",
    },
    components: [],
  };
}
export function packageLine(
  pack: RecordOf<Package>,
  items: Catalog["items"],
): Line {
  return {
    ...newLine(),
    type: "PACKAGE",
    packageId: pack.id,
    name: pack.name,
    description: pack.description,
    unit: "package",
    sellingPrice: pack.sellingPrice,
    sellingBasis: pack.sellingBasis,
    components: pack.components.map((c) => {
      const item = items.find((i) => i.id === c.itemId);
      if (!item) throw new Error("Package component not found");
      const l = newLine(item);
      return {
        id: l.id,
        itemId: l.itemId,
        name: l.name,
        description: l.description,
        unit: l.unit,
        quantity: c.quantity,
        duration: "1",
        cost: l.cost,
      };
    }),
  };
}
