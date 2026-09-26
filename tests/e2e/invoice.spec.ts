import { selectOption } from "./controls";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
}
async function quotation(page: Page, event: string) {
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Invoice Demo Customer");
  await page.getByLabel("Event / project", { exact: true }).fill(event);
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page
    .getByLabel("Item name", { exact: true })
    .fill("Event production service");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("1500001");
  await page.getByLabel("Cost per unit", { exact: true }).fill("175000");
  await page.getByLabel("Apply VAT (PPN)", { exact: true }).check();
  await page.getByLabel("Apply income tax (PPh)", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  return page.url();
}
test("invoice split workflow: create, save, issue, revise source, final installment, print, and auth", async ({
  page,
  request,
}) => {
  await page.goto("/invoice");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/invoice/11111111-1111-4111-8111-111111111111/print");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  const quotationUrl = await quotation(page, "Split invoice event");
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await selectOption(page, "Invoice type", "Down payment (50%)");
  await expect(page.locator(".grand-total")).toContainText("Rp847.501");
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  const depositUrl = page.url();
  await expect(page.locator("h1")).toContainText("INV/");
  await page
    .getByLabel("Invoice notes", { exact: true })
    .fill("DP invoice note");
  await page
    .getByLabel("Account number", { exact: true })
    .fill("INVOICE-BANK-123");
  const outgoing = page.waitForRequest(
    (r) => r.method() === "POST" && !!r.headers()["next-action"],
  );
  await page
    .getByRole("button", { name: "Save invoice", exact: true })
    .first()
    .click();
  const action = await outgoing;
  await expect(
    page.getByRole("button", { name: "Issue invoice", exact: true }),
  ).toBeEnabled();
  const replay = await request.post(new URL(depositUrl).pathname, {
    headers: {
      "next-action": action.headers()["next-action"],
      "content-type": action.headers()["content-type"],
      origin: "http://localhost:3210",
    },
    data: action.postData()!,
    maxRedirects: 0,
  });
  expect(
    replay.headers()["x-action-redirect"] || replay.headers().location || "",
  ).toContain("/login");
  await page
    .getByRole("button", { name: "Issue invoice", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Issue this invoice?" })
    .getByRole("button", { name: "Issue invoice", exact: true })
    .click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Issued");
  await expect(page.getByLabel("Invoice date", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/invoice-dark.png",
    fullPage: true,
  });
  await page.goto(quotationUrl);
  await page.getByRole("button", { name: "Mark as sent", exact: true }).click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Sent");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("2000000");
  await page
    .getByRole("button", { name: "Save new revision", exact: true })
    .first()
    .click();
  await expect(page).not.toHaveURL(quotationUrl);
  await page.goto(depositUrl);
  await page
    .getByRole("link", { name: "Create final installment", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Invoice type", exact: true }),
  ).toContainText("Final installment (50%)");
  await expect(page.locator(".grand-total")).toContainText("Rp847.500");
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  const finalUrl = page.url();
  await expect(page.locator(".grand-total")).toContainText("Rp847.500");
  await page.goto(depositUrl + "/print");
  await expect(page.locator(".paper")).toContainText("INVOICE");
  await expect(page.locator(".paper")).toContainText("Down payment (50%)");
  await expect(page.locator(".paper")).toContainText("Rp847.501");
  await expect(page.locator(".paper")).toContainText("INVOICE-BANK-123");
  const html = await page.content();
  for (const privateText of [
    "175000",
    "vendorPriceId",
    "vendorName",
    "bankDefaults",
    "Gross profit",
    "Cost per unit",
  ])
    expect(html).not.toContain(privateText);
  const pdf = await page.pdf({
    path: "test-results/invoice-deposit.pdf",
    format: "A4",
    printBackground: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await page.screenshot({
    path: "test-results/invoice-print.png",
    fullPage: true,
  });
  await page.goto(finalUrl);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/invoice-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/invoice");
  await page
    .getByLabel("Search invoices", { exact: true })
    .fill("Split invoice event");
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("full invoice prints total, can be voided, and a new billing plan can be created", async ({
  page,
}) => {
  await login(page);
  const source = await quotation(page, "Full invoice event");
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  const invoiceUrl = page.url();
  const originalNumber = await page.locator("h1").innerText();
  await page.goto(invoiceUrl + "/print");
  await expect(page.locator(".paper")).toContainText("Invoice total");
  await expect(page.locator(".paper")).toContainText("Rp1.695.001");
  await page.goto(source);
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open existing invoice", exact: true }),
  ).toHaveAttribute("href", new URL(invoiceUrl).pathname);
  await selectOption(page, "Invoice type", "Down payment (50%)");
  await expect(
    page.getByRole("button", { name: "Create invoice draft", exact: true }),
  ).toBeDisabled();
  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: "Void invoice", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Void this invoice?" })
    .getByRole("button", { name: "Void invoice", exact: true })
    .click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Void");
  await page.goto(invoiceUrl + "/print");
  await expect(page.locator(".document-void")).toContainText(
    "not a payment request",
  );
  await page.goto(source);
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await selectOption(page, "Invoice type", "Down payment (50%)");
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  await expect(page.locator("h1")).not.toHaveText(originalNumber);
});
