import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
}
async function accessible(page: Page) {
  // Inspect settled colors, not intermediate theme or page-entry transitions.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

test("theme preferences persist, follow the system, and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await login(page);
  await accessible(page);
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dark mode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await accessible(page);
  await page.screenshot({
    path: "test-results/workspace-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "System theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".content")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("large catalogs support search, categories, paging, keyboard, batch add, collapse, and undo", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quotation/new");
  const trigger = page.getByRole("button", {
    name: "Add catalog item",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Add catalog item",
    exact: true,
  });
  const search = dialog.getByRole("combobox");
  await expect(search).toBeFocused();
  await expect(dialog.getByRole("option")).toHaveCount(20);
  await dialog
    .getByRole("button", { name: "Next results", exact: true })
    .click();
  await expect(dialog).toContainText("Page 2 of 51");
  await search.fill("TEST-1000");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await search.press("Enter");
  await search.fill("TEST-0999");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(
    dialog.getByRole("button", { name: "Add 2 items", exact: true }),
  ).toBeEnabled();
  await search.fill("does-not-exist");
  await expect(dialog).toContainText("No matches found");
  await dialog
    .getByRole("button", { name: "Clear search", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Audio", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("500 results");
  await accessible(page);
  await page.screenshot({ path: "test-results/catalog-picker.png" });
  await dialog
    .getByRole("button", { name: "Add 2 items", exact: true })
    .click();
  await expect(page.locator(".quote-line")).toHaveCount(2);
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Collapse all items", exact: true })
    .click();
  await expect(
    page.getByLabel("Item name", { exact: true }).first(),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Expand all items", exact: true })
    .click();
  await expect(
    page.getByLabel("Item name", { exact: true }).first(),
  ).toHaveValue("Catalog fixture 1000");
  await page
    .getByRole("button", { name: "Remove item", exact: true })
    .first()
    .click();
  await expect(page.locator(".quote-line")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByLabel("Item name", { exact: true }).first(),
  ).toHaveValue("Catalog fixture 1000");
  await trigger.click();
  await search.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  // New client navigation warns before discarding edits.
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await page
    .getByRole("link", { name: "All quotations", exact: false })
    .click();
  await expect(page).toHaveURL(/\/quotation\/new$/);
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await accessible(page);
  await page.screenshot({
    path: "test-results/editor-dark.png",
    fullPage: true,
  });
});

test("tutorial is skippable, replayable, keyboard accessible, and available on mobile", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Take a quick tour", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Your first quotation",
    exact: true,
  });
  await accessible(page);
  await expect(dialog).toContainText("Start with the customer");
  for (let index = 0; index < 4; index++)
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog).toContainText("Save, review, and share");
  await dialog
    .getByRole("button", { name: "Got it, let’s start", exact: true })
    .click();
  await expect(page.locator(".welcome-card")).not.toBeVisible();
  await page.reload();
  await expect(page.locator(".welcome-card")).not.toBeVisible();
  await page.getByRole("button", { name: "Quick tour", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Quick tour", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Dark mode", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.locator(".mobile-navigation summary").click();
  await page
    .getByRole("link", { name: "Getting started", exact: true })
    .click();
  await expect(page).toHaveURL(/\/help$/);
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/help-mobile.png",
    fullPage: true,
  });
});

test("master lists paginate and dialogs restore focus, including nested item searches", async ({
  page,
}) => {
  await login(page);
  await page.goto("/master/items");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("Page 2 of");
  await page.getByLabel("Search records").fill("TEST-1000");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await accessible(page);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeFocused();
  await page.goto("/master/packages");
  await page.getByRole("button", { name: "Add package", exact: false }).click();
  await page.getByRole("button", { name: "Component", exact: false }).click();
  await page.getByRole("button", { name: "Component 1", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Component 1", exact: true })
    .getByRole("combobox")
    .fill("TEST-1000");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Component 1", exact: true }),
  ).toContainText("Catalog fixture 1000");
});
