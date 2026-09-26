import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  DEFAULT_QUOTATION_NOTES,
  DEFAULT_QUOTATION_TERMS,
} from "../../lib/domain/model";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
}
test("multi-day quotation: choose range, apply billing days, restore terms, save and print", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Multi-day Client");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Three-day event");
  await expect(page.getByLabel("Quotation terms", { exact: true })).toHaveValue(
    DEFAULT_QUOTATION_TERMS,
  );
  await expect(page.getByLabel("Quotation notes", { exact: true })).toHaveValue(
    DEFAULT_QUOTATION_NOTES,
  );
  const start = page.getByLabel("Event start date", { exact: true });
  const end = page.getByLabel("Event end date", { exact: true });
  await start.fill("2026-09-30");
  await page
    .getByRole("button", { name: "Choose event dates", exact: true })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Choose event dates",
    exact: true,
  });
  await calendar.locator('[data-day="2026-09-30"] button').click();
  await expect(
    calendar.getByText("Now choose the last day, or use this single day."),
  ).toBeVisible();
  await calendar.locator('[data-day="2026-10-02"] button').click();
  await expect(end).toHaveValue("");
  await calendar
    .getByRole("button", { name: "Use dates", exact: true })
    .click();
  await expect(start).toHaveValue("2026-09-30");
  await expect(end).toHaveValue("2026-10-02");
  await expect(page.locator(".event-days-badge")).toHaveText("3 days");
  await end.fill("2026-09-29");
  await expect(
    page.getByText("End date must be on or after the start date."),
  ).toBeVisible();
  await end.fill("2026-10-02");
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page.getByLabel("Item name", { exact: true }).fill("Event equipment");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("100000");
  await page.getByLabel("Cost per unit", { exact: true }).fill("20000");
  const duration = page.getByLabel("Duration (days)", { exact: true });
  await expect(duration).toHaveValue("1");
  await page
    .getByRole("button", { name: "Apply 3 days to daily items", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Update daily item durations?" })
    .getByRole("button", { name: "Apply event duration", exact: true })
    .click();
  await expect(duration).toHaveValue("3");
  await expect(
    page.getByRole("progressbar", { name: "Quotation readiness" }),
  ).toHaveAttribute("aria-valuenow", "3");
  await page.getByLabel("Quotation notes", { exact: true }).fill("Custom note");
  await page
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.getByLabel("Quotation notes", { exact: true })).toHaveValue(
    "Custom note",
  );
  await page
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await expect(page.getByLabel("Quotation notes", { exact: true })).toHaveValue(
    DEFAULT_QUOTATION_NOTES,
  );
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  const quote = page.url();
  await page.reload();
  await expect(end).toHaveValue("2026-10-02");
  await page.goto(quote + "/print");
  await expect(page.locator(".document-info")).toContainText(
    "2026-09-30 – 2026-10-02",
  );
  await expect(page.locator(".paper")).toContainText("Rp300.000");
  await expect(page.locator(".paper")).toContainText(
    "Payment Terms: A 50% Down Payment (DP)",
  );
  await expect(page.locator(".paper")).toContainText(
    "This quotation is valid until the date shown.",
  );
  const pdf = await page.pdf({
    path: "test-results/event-range-quotation.pdf",
    format: "A4",
    printBackground: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  await page.goto(quote);
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  await page.goto(page.url() + "/print");
  await expect(page.locator(".document-info")).toContainText(
    "2026-09-30 – 2026-10-02",
  );
  await page.goto(quote);
  await end.fill("2026-10-04");
  await expect(
    page.getByRole("link", { name: "Print ↗", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
});

test("range picker fits phones and tablets in dark mode and supports keyboard, clear and cancel", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quotation/new");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  const start = page.getByLabel("Event start date", { exact: true });
  const end = page.getByLabel("Event end date", { exact: true });
  for (const { width, height } of [
    { width: 320, height: 900 },
    { width: 390, height: 900 },
    { width: 820, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize({ width, height });
    await start.fill("2026-09-30");
    await end.fill("");
    await page
      .getByRole("button", { name: "Choose event dates", exact: true })
      .click();
    const calendar = page.getByRole("dialog", {
      name: "Choose event dates",
      exact: true,
    });
    const day = calendar.locator('[data-day="2026-09-30"] button');
    await day.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(calendar.locator(".range-selection-preview")).toHaveText(
      "2026-09-30 – 2026-10-01",
    );
    const box = (await calendar.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      calendar.getByRole("button", { name: "Use dates", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    if (width === 390) {
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: "test-results/event-range-phone-dark.png",
        animations: "disabled",
      });
    }
    await page.keyboard.press("Escape");
    await expect(end).toHaveValue("");
    await page
      .getByRole("button", { name: "Clear dates", exact: true })
      .click();
    await expect(start).toHaveValue("");
    await expect(end).toHaveValue("");
  }
});
