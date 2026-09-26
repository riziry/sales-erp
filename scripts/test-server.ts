import { spawn } from "node:child_process";
import { testDatabase } from "../tests/database";
import { users, items } from "../lib/db/schema";
import { hashPassword } from "../lib/server/password";
import { defaultProfile } from "../lib/domain/model";
import { saveMaster, saveProfile } from "../lib/server/repository";
import { item } from "../tests/fixtures";
async function main() {
  const fixture = await testDatabase();
  await fixture.db.insert(users).values({
    id: 1,
    email: "test@yw.local",
    passwordHash: hashPassword("test-internal-password"),
  });
  await saveProfile(fixture.db, {
    ...defaultProfile,
    address: "Jakarta, Indonesia",
    contact: "021 555 0101",
    regularBank: {
      bank: "Non-tax Bank",
      number: "1234567890",
      holder: "YW Production",
    },
    taxBank: {
      bank: "Tax Bank",
      number: "9876543210",
      holder: "PT YW Production",
    },
  });
  const itemId = await saveMaster(fixture.db, "items", null, item);
  // Large catalog fixture exercises search and pagination without real application data.
  await fixture.db.insert(items).values(
    Array.from({ length: 1000 }, (_, index) => ({
      sku: `TEST-${String(index + 1).padStart(4, "0")}`,
      name: `Catalog fixture ${String(index + 1).padStart(4, "0")}`,
      data: {
        ...item,
        sku: `TEST-${String(index + 1).padStart(4, "0")}`,
        name: `Catalog fixture ${String(index + 1).padStart(4, "0")}`,
        category: index % 2 ? "Audio" : "Lighting",
      },
    })),
  );
  const vendorId = await saveMaster(fixture.db, "vendors", null, {
    name: "Vendor B PRIVATE",
    contact: "0800123456",
    email: "",
    address: "",
    notes: "",
    active: true,
  });
  await saveMaster(fixture.db, "prices", null, {
    itemId,
    vendorId,
    price: "175000",
    unit: "unit",
    basis: "DAILY",
    notes: "Event reference",
    active: true,
  });
  await saveMaster(fixture.db, "packages", null, {
    name: "10,000 Watt Sound System",
    description: "Production package with customizable components.",
    sellingPrice: "5000000",
    sellingBasis: "DAILY",
    active: true,
    components: [{ itemId, quantity: "4" }],
  });
  await saveMaster(fixture.db, "customers", null, {
    name: "PT Event Nusantara",
    contact: "Ms. Rina",
    email: "rina@example.test",
    address: "South Jakarta",
    notes: "",
    active: true,
  });
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      process.env.E2E_DEV === "1" ? "dev" : "start",
      "-p",
      process.env.E2E_PORT || "3210",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: fixture.url,
        AUTH_PROVIDER: "internal",
      },
    },
  );
  let closing = false;
  async function close(code = 0) {
    if (closing) return;
    closing = true;
    child.kill("SIGTERM");
    await fixture.close();
    process.exit(code);
  }
  process.on("SIGTERM", () => void close());
  process.on("SIGINT", () => void close());
  child.on("exit", (code) => void close(code || 0));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
