import { test, expect, type Page } from "@playwright/test";
async function fits(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      { message: `Page must not overflow horizontally: ${page.url()}` },
    )
    .toBe(true);
}
for (const size of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1180, height: 820 },
]) {
  test(`phone/tablet layout ${size.width}x${size.height}: navigation, lists, forms and dialogs`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/login");
    await fits(page);
    await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
    await page
      .getByLabel("Password", { exact: true })
      .fill("test-internal-password");
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page).toHaveURL(/\/quotation$/);
    if (size.width <= 1100) {
      await expect(page.locator(".desktop-navigation")).not.toBeVisible();
      await page.locator(".mobile-navigation summary").click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Sales overview", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sales$/);
      await expect(page.locator(".mobile-navigation")).not.toHaveAttribute(
        "open",
        "",
      );
    }
    for (const path of [
      "/sales",
      "/quotation",
      "/invoice",
      "/master/items",
      "/master/prices",
      "/profile",
      "/account",
      "/help",
    ]) {
      await page.goto(path);
      await fits(page);
    }
    await page.goto("/master/items");
    if (size.width <= 760) {
      expect(
        await page
          .locator(".record-table tbody tr")
          .first()
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await expect(
        page
          .locator(".record-table .record-actions")
          .first()
          .getByRole("button", { name: "Edit", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: `test-results/responsive-list-${size.width}.png`,
    });
    await page.getByRole("button", { name: "Add item", exact: false }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    expect(
      await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await modal
      .getByLabel("Default selling price", { exact: true })
      .fill("123456789012");
    await expect(
      modal.getByLabel("Default selling price", { exact: true }),
    ).toHaveValue("123.456.789.012");
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page.goto("/quotation/new");
    await page
      .getByRole("button", { name: "Add catalog item", exact: true })
      .click();
    const picker = page.getByRole("dialog", {
      name: "Add catalog item",
      exact: true,
    });
    await picker.getByRole("combobox").fill("LED-001");
    await picker.getByRole("option").first().click();
    await expect(
      picker.getByRole("button", { name: "Add 1 item", exact: true }),
    ).toBeInViewport();
    await picker
      .getByRole("button", { name: "Add 1 item", exact: true })
      .click();
    await fits(page);
    const price = page.getByLabel("Selling price per unit", { exact: true });
    await price.fill("1234567890");
    await expect(price).toHaveValue("1.234.567.890");
    if (size.width <= 1100 && size.height > 540) {
      expect(
        await price.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      const bar = page.getByRole("region", {
        name: "Document quick actions",
        exact: true,
      });
      await expect(bar).toBeInViewport();
      await bar
        .getByRole("link", { name: "Review document totals", exact: true })
        .click();
      await expect(page.locator("#quote-review")).toBeInViewport();
    }
    await page.screenshot({
      path: `test-results/responsive-editor-${size.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Add package", exact: true })
      .click();
    const packages = page.getByRole("dialog", {
      name: "Add package",
      exact: true,
    });
    await packages.getByRole("combobox").fill("10,000");
    await packages.getByRole("option").first().click();
    await fits(page);
    expect(
      await page
        .locator(".quote-line")
        .last()
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  });
}
