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

test("navigation does not overflow on hover and remains reachable on short screens", async ({
  page,
}) => {
  await login(page);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1180, height: 600 },
  ]) {
    await page.setViewportSize(size);
    const links = page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link");
    for (const link of await links.all()) {
      await link.hover();
      await page.waitForTimeout(200);
      expect(
        await page
          .locator(".desktop-navigation")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
    await links.last().focus();
    await expect(links.last()).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeInViewport();
  }
  for (const width of [320, 820]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator(".mobile-navigation summary").click();
    const nav = page.getByRole("navigation", {
      name: "Mobile navigation",
      exact: true,
    });
    expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await nav
      .getByRole("link", { name: "Company & accounts", exact: true })
      .click();
    await expect(page).toHaveURL(/\/profile$/);
  }
});

test("quotation and invoice print with internal page spacing, including long documents", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Print layout customer");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Clean print layout");
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page
    .getByLabel("Item name", { exact: true })
    .fill("Print layout service");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("100000");
  await page.getByLabel("Cost per unit", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  const quotationUrl = page.url();
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  const invoiceUrl = page.url();
  for (const [name, url] of [
    ["quotation", quotationUrl],
    ["invoice", invoiceUrl],
  ]) {
    await page.goto(`${url}/print`);
    await expect(page.locator(".print-settings-hint")).toContainText(
      "Headers and footers",
    );
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".print-toolbar")).not.toBeVisible();
    expect(
      await page.locator(".paper").evaluate((el) => ({
        padding: parseFloat(getComputedStyle(el).paddingTop),
        clone: getComputedStyle(el).boxDecorationBreak,
      })),
    ).toEqual({ padding: expect.closeTo(52.913, 1), clone: "clone" });
    const pdf = await page.pdf({
      path: `test-results/clean-${name}.pdf`,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      printBackground: true,
    });
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
    // Stress the real document renderer without changing saved business records.
    await page.locator(".document-table tbody").evaluate((body) => {
      const row = body.querySelector("tr")!;
      for (let index = 0; index < 65; index++) {
        const clone = row.cloneNode(true) as HTMLElement;
        clone.querySelector("td")!.textContent = `Print row ${index + 2}`;
        body.appendChild(clone);
      }
    });
    const long = await page.pdf({
      path: `test-results/clean-${name}-long.pdf`,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      printBackground: true,
    });
    expect(
      long.toString("latin1").match(/\/Type\s*\/Page\b/g)!.length,
    ).toBeGreaterThan(1);
    await page.emulateMedia({ media: "screen" });
  }
});
