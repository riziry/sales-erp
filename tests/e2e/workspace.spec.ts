import { selectOption } from "./controls";
import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
}

async function pick(
  page: Page,
  label: string,
  query: string,
  multiple = false,
) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: label, exact: true });
  await dialog.getByRole("combobox").fill(query);
  await dialog.getByRole("option").first().click();
  if (multiple)
    await dialog
      .getByRole("button", { name: "Add 1 item", exact: true })
      .click();
}

test("pages and actions require authentication; cookies are secure and logout revokes sessions", async ({
  page,
  request,
}) => {
  await page.goto("/quotation/new");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/quotation/11111111-1111-4111-8111-111111111111/print");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "yw_session")!;
  expect(session.httpOnly).toBe(true);
  expect(session.secure).toBe(true);
  expect(session.sameSite).toBe("Lax");
  await page.goto("/profile");
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Authenticated test company");
  const actionRequest = page.waitForRequest(
    (r) => r.method() === "POST" && !!r.headers()["next-action"],
  );
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  const action = await actionRequest;
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved successfully" }),
  ).toContainText("Profile saved successfully");
  const replay = await request.post("/profile", {
    headers: {
      "next-action": action.headers()["next-action"],
      "content-type": action.headers()["content-type"],
      origin: "http://localhost:3210",
    },
    data: action.postData()!,
    maxRedirects: 0,
  });
  expect(
    replay.headers()["x-action-redirect"] || replay.headers()["location"] || "",
  ).toContain("/login");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const stale = await request.get("/quotation", {
    headers: { cookie: `yw_session=${session.value}` },
    maxRedirects: 0,
  });
  expect(stale.status()).toBe(307);
  expect(stale.headers().location).toContain("/login");
});

test("vendor quotation: save, send, approve, revise, and print without internal costs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.getByRole("link", { name: "Create quotation" }).first().click();
  await pick(page, "Select customer", "PT Event Nusantara");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Annual Gathering 2026");
  await page
    .getByLabel("Event location", { exact: true })
    .fill("Jakarta Convention Center");
  await pick(page, "Add catalog item", "LED-001", true);
  const line = page.locator(".quote-line").first();
  await line.getByLabel("Qty", { exact: true }).fill("20");
  await line.getByLabel("Duration (days)", { exact: true }).fill("2");
  await selectOption(line, "Cost source", "Vendor");
  await pick(page, "Vendor price", "Vendor B");
  await expect(page.locator(".profit-box")).toContainText("Rp7.000.000");
  await expect(page.locator(".grand-total")).toContainText("Rp14.000.000");
  await page.getByLabel("Apply income tax (PPh)", { exact: true }).check();
  await expect(page.getByLabel("Account number", { exact: true })).toHaveValue(
    "1234567890",
  );
  await page.getByLabel("Apply VAT (PPN)", { exact: true }).check();
  await expect(page.getByLabel("Account number", { exact: true })).toHaveValue(
    "9876543210",
  );
  await expect(page.locator(".grand-total")).toContainText("Rp15.820.000");
  await page.getByLabel("Account number", { exact: true }).fill("MANUAL-123");
  await page.getByLabel("Apply VAT (PPN)", { exact: true }).uncheck();
  await expect(page.getByLabel("Account number", { exact: true })).toHaveValue(
    "MANUAL-123",
  );
  await page.getByLabel("Apply VAT (PPN)", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  const originalUrl = page.url();
  await page.getByRole("button", { name: "Mark as sent", exact: true }).click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Sent");
  await page
    .getByRole("button", { name: "Mark as approved", exact: true })
    .click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Approved");
  await page
    .locator(".quote-line")
    .getByLabel("Item name", { exact: true })
    .fill("PAR LED — customer label");
  await page
    .locator(".quote-line")
    .getByLabel("Qty", { exact: true })
    .fill("50");
  await page
    .getByRole("button", { name: "Save new revision", exact: true })
    .first()
    .click();
  await expect(page).not.toHaveURL(originalUrl);
  await expect(page.locator("h1 .revision")).toHaveText("R2");
  await expect(page.locator(".heading-actions .badge")).toHaveText("Draft");
  const revisedUrl = page.url();
  await page.goto(originalUrl);
  await expect(page.getByLabel("Item name", { exact: true })).toHaveValue(
    "PAR LED 54 RGBW",
  );
  await expect(page.getByLabel("Qty", { exact: true })).toHaveValue("20");
  await expect(page.getByLabel("Qty", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await page.goto(revisedUrl + "/print");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator(".paper")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  expect(
    await page.locator(".paper").evaluate((el) => getComputedStyle(el).color),
  ).toBe("rgb(32, 44, 40)");
  await expect(page.locator(".paper")).toContainText(
    "PAR LED — customer label",
  );
  await expect(page.locator(".paper")).toContainText("MANUAL-123");
  const html = await page.content();
  for (const word of [
    "Vendor B PRIVATE",
    "vendorPriceId",
    "bankDefaults",
    "175000",
    "Gross profit",
    "Cost per unit",
  ])
    expect(html).not.toContain(word);
  await page.pdf({
    path: "test-results/quotation.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.screenshot({
    path: "test-results/quotation-print.png",
    fullPage: true,
  });
  await page.goto("/quotation");
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await page
    .getByLabel("Search quotations", { exact: true })
    .fill("Annual Gathering");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/quotation-list.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("packages, discounts, custom items, missing costs, and manual cost overrides", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Package Customer");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Music Festival");
  await pick(page, "Add package", "10,000 Watt Sound System");
  const pack = page.locator(".quote-line").first();
  await pack.getByLabel("Qty", { exact: true }).fill("2");
  await pack.getByLabel("Duration (days)", { exact: true }).fill("2");
  await pack.getByLabel("Cost duration (days)", { exact: true }).fill("2");
  await pack
    .getByLabel("Component name", { exact: true })
    .fill("Custom lighting");
  await pack.getByLabel("Cost per unit", { exact: true }).fill("100000");
  await expect(
    pack.getByRole("combobox", { name: "Cost source", exact: true }),
  ).toContainText("Custom / manual");
  await pack.getByLabel("Item discount value", { exact: true }).fill("10");
  await selectOption(page, "Overall discount", "Rupiah (Rp)");
  await page
    .getByLabel("Overall discount value", { exact: true })
    .fill("1000000");
  await expect(page.locator(".grand-total")).toContainText("Rp17.000.000");
  await expect(page.locator(".profit-box")).toContainText("Rp1.600.000");
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  const custom = page.locator(".quote-line").nth(1);
  await custom.getByLabel("Item name", { exact: true }).fill("Transport");
  await custom
    .getByLabel("Selling price per unit", { exact: true })
    .fill("500000");
  await selectOption(custom, "Selling price basis", "Once / event");
  await selectOption(custom, "Cost basis", "Once / event");
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  await expect(
    page.getByRole("button", { name: "Mark as sent" }),
  ).toBeDisabled();
  await page
    .locator(".quote-line")
    .nth(1)
    .getByLabel("Cost per unit", { exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Mark as sent" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/quotation-editor.png",
    fullPage: true,
  });
  const url = page.url();
  await page.goto(url + "/print");
  await expect(page.locator(".document-components")).toContainText(
    "Custom lighting — 8 unit",
  );
  await expect(page.locator(".paper")).toContainText("Rp17.500.000");
  await page.goto(url);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Package name", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    path: "test-results/quotation-mobile.png",
    fullPage: true,
  });
});

test("master item CRUD, vendor comparison, packages, and profile settings", async ({
  page,
}) => {
  await login(page);
  await page.goto("/master/items");
  await page.getByRole("button", { name: "Add item" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Wireless Microphone");
  await dialog.getByLabel("SKU", { exact: true }).fill("MIC-001");
  await dialog
    .getByLabel("Default selling price", { exact: true })
    .fill("200000");
  await dialog
    .getByLabel("Internal reference cost (leave blank if unknown)", {
      exact: true,
    })
    .fill("50000");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByLabel("Search records", { exact: true })
    .fill("Wireless Microphone");
  const row = page.getByRole("row").filter({ hasText: "Wireless Microphone" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Active", { exact: true })
    .uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(row).not.toBeVisible();
  await selectOption(page, "Filter active status", "Inactive");
  await expect(row).toBeVisible();
  await page.goto("/master/items");
  await page.getByLabel("Search records", { exact: true }).fill("PAR LED");
  await page
    .getByRole("row")
    .filter({ hasText: "PAR LED" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Vendor B PRIVATE");
  await expect(page.getByRole("dialog")).toContainText("Rp175.000");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.goto("/master/packages");
  await page.getByRole("button", { name: "Add package", exact: false }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Lighting Package");
  await page
    .getByRole("dialog")
    .getByLabel("Default selling price", { exact: true })
    .fill("2500000");
  await page.getByRole("button", { name: "Component", exact: false }).click();
  await pick(page, "Component 1", "PAR LED 54 RGBW");
  await page.getByLabel("Qty per package", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Lighting Package" }),
  ).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("VAT rate (PPN, %)", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved successfully" }),
  ).toBeVisible();
  await page.goto("/quotation/new");
  await expect(page.getByLabel("VAT (PPN, %)", { exact: true })).toHaveValue(
    "12",
  );
});
