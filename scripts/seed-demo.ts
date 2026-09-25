import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db/schema";
import {
  catalog,
  listQuotations,
  profile,
  saveMaster,
  saveQuotation,
} from "../lib/server/repository";
import {
  emptyContact,
  newLine,
  newQuotation,
  packageLine,
  selectTax,
  type Item,
  type MasterKind,
} from "../lib/domain/model";
import { calculate } from "../lib/domain/calculate";

loadEnvConfig(process.cwd());
const note =
  "DEMO data for testing only. Not a real customer order or commercial price.";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(pool, { schema });
  try {
    const existing = await catalog(db);
    let created = 0;
    async function ensure(kind: MasterKind, data: unknown, id?: string) {
      if (id) return id;
      const saved = await saveMaster(db, kind, null, data);
      created++;
      return saved;
    }
    const definitions = [
      {
        sku: "DEMO-LED-001",
        name: "[DEMO] PAR LED 54 RGBW",
        category: "Lighting",
        subcategory: "PAR",
        sellingPrice: "350000",
        internalCost: "150000",
        description: "RGBW stage wash light for events.",
      },
      {
        sku: "DEMO-SPK-001",
        name: "[DEMO] Full-range Speaker",
        category: "Audio",
        subcategory: "Speakers",
        sellingPrice: "700000",
        internalCost: "300000",
        description: "Full-range speaker for the demonstration sound package.",
      },
      {
        sku: "DEMO-SUB-001",
        name: "[DEMO] Subwoofer",
        category: "Audio",
        subcategory: "Speakers",
        sellingPrice: "900000",
        internalCost: "400000",
        description: "Subwoofer for the demonstration sound package.",
      },
      {
        sku: "DEMO-MIX-001",
        name: "[DEMO] Digital Mixer 32 Channels",
        category: "Audio",
        subcategory: "Mixers",
        sellingPrice: "1000000",
        internalCost: "400000",
        description: "Digital console for live event mixing.",
      },
      {
        sku: "DEMO-MIC-001",
        name: "[DEMO] Wireless Microphone",
        category: "Audio",
        subcategory: "Microphones",
        sellingPrice: "200000",
        internalCost: "80000",
        description:
          "Handheld wireless microphone for speeches and performances.",
      },
    ];
    for (const definition of definitions) {
      const item: Item = {
        ...definition,
        unit: "unit",
        sellingBasis: "DAILY",
        costBasis: "DAILY",
        active: true,
        externalInventoryItemId: null,
        notes: note,
      };
      await ensure(
        "items",
        item,
        existing.items.find((row) => row.sku === item.sku)?.id,
      );
    }
    for (const [name, contact, email] of [
      [
        "[DEMO] Nusantara Events",
        "Demo Event Coordinator",
        "events@example.test",
      ],
      [
        "[DEMO] Aurora Creative",
        "Demo Project Coordinator",
        "creative@example.test",
      ],
    ])
      await ensure(
        "customers",
        {
          ...emptyContact,
          name,
          contact,
          email,
          address: "Jakarta — demonstration address",
          notes: note,
        },
        existing.customers.find((row) => row.name === name)?.id,
      );
    for (const [name, email] of [
      ["[DEMO] Vendor A — Stage Partner", "vendor-a@example.test"],
      ["[DEMO] Vendor B — Event Partner", "vendor-b@example.test"],
    ])
      await ensure(
        "vendors",
        {
          ...emptyContact,
          name,
          email,
          contact: "Demo Vendor Contact",
          address: "Jakarta — demonstration address",
          notes: note,
        },
        existing.vendors.find((row) => row.name === name)?.id,
      );
    const c = await catalog(db);
    const led = c.items.find((row) => row.sku === "DEMO-LED-001")!;
    const vendorA = c.vendors.find(
      (row) => row.name === "[DEMO] Vendor A — Stage Partner",
    )!;
    const vendorB = c.vendors.find(
      (row) => row.name === "[DEMO] Vendor B — Event Partner",
    )!;
    for (const [vendor, price] of [
      [vendorA, "200000"],
      [vendorB, "175000"],
    ] as const) {
      await ensure(
        "prices",
        {
          itemId: led.id,
          vendorId: vendor.id,
          price,
          unit: "unit",
          basis: "DAILY",
          active: true,
          notes: note,
        },
        c.prices.find(
          (row) =>
            row.itemId === led.id &&
            row.vendorId === vendor.id &&
            row.notes === note,
        )?.id,
      );
    }
    const packageName = "[DEMO] Sound System 10,000 W";
    await ensure(
      "packages",
      {
        name: packageName,
        description:
          "Demo bundle: 4 full-range speakers, 4 subwoofers, 1 digital mixer, and 4 wireless microphones. Edit the contents and price to test your workflow.",
        sellingPrice: "8000000",
        sellingBasis: "DAILY",
        active: true,
        components: [
          ["DEMO-SPK-001", "4"],
          ["DEMO-SUB-001", "4"],
          ["DEMO-MIX-001", "1"],
          ["DEMO-MIC-001", "4"],
        ].map(([sku, quantity]) => ({
          itemId: c.items.find((row) => row.sku === sku)!.id,
          quantity,
        })),
      },
      c.packages.find((row) => row.name === packageName)?.id,
    );
    const ready = await catalog(db);
    const company = await profile(db);
    const currentQuotes = await listQuotations(db);
    const customer1 = ready.customers.find(
      (row) => row.name === "[DEMO] Nusantara Events",
    )!;
    const customer2 = ready.customers.find(
      (row) => row.name === "[DEMO] Aurora Creative",
    )!;
    const lighting = newQuotation(company);
    lighting.customerId = customer1.id;
    lighting.customer = { ...customer1 };
    lighting.event = "[DEMO] Annual Gathering — Vendor Lighting";
    lighting.location = "Jakarta — Demo Ballroom";
    lighting.eventDate = lighting.validUntil;
    lighting.notes = note;
    const light = newLine(led);
    light.quantity = "20";
    light.duration = "2";
    const vendorPrice = ready.prices.find(
      (row) =>
        row.itemId === led.id &&
        row.vendorId === vendorB.id &&
        row.notes === note,
    )!;
    light.cost = {
      source: "VENDOR",
      amount: vendorPrice.price,
      basis: vendorPrice.basis,
      unit: vendorPrice.unit,
      vendorId: vendorB.id,
      vendorPriceId: vendorPrice.id,
      vendorName: vendorB.name,
    };
    lighting.lines = [light];
    let sound = newQuotation(company);
    sound.customerId = customer2.id;
    sound.customer = { ...customer2 };
    sound.event = "[DEMO] Music Showcase — Package & Transport";
    sound.location = "Jakarta — Demo Event Hall";
    sound.eventDate = sound.validUntil;
    sound.notes = note;
    const bundle = packageLine(
      ready.packages.find((row) => row.name === packageName)!,
      ready.items,
    );
    bundle.discount = { type: "PERCENT", value: "5" };
    const transport = newLine();
    transport.name = "[DEMO] Event Transport";
    transport.description = "One-time commercial service charge.";
    transport.unit = "trip";
    transport.sellingPrice = "500000";
    transport.sellingBasis = "ONE_TIME";
    transport.cost = {
      ...transport.cost,
      amount: "300000",
      basis: "ONE_TIME",
      unit: "trip",
    };
    sound.lines = [bundle, transport];
    sound.discount = { type: "AMOUNT", value: "100000" };
    sound = selectTax(sound, true);
    sound.pphEnabled = true;
    for (const data of [lighting, sound]) {
      if (!currentQuotes.some((row) => row.data.event === data.event)) {
        await saveQuotation(db, { id: null, version: null, data });
        created++;
      }
    }
    const quotes = (await listQuotations(db)).filter((row) =>
      [lighting.event, sound.event].includes(row.data.event),
    );
    console.log(
      JSON.stringify(
        {
          created,
          quotations: quotes.map((row) => ({
            id: row.id,
            number: row.number,
            status: row.status,
            event: row.data.event,
            totals: calculate(row.data),
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Demo import failed. Check database access and application schema; rerunning safely skips existing demo records.",
  );
  process.exitCode = 1;
});
