import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("directory search, category filters, discard protection, save feedback, and keyboard quick actions", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/master/items");
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Items & services");
  const search = page.getByLabel("Search records", { exact: true });
  await search.fill("fixture 1000");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear search records", exact: true })
    .click();
  await expect(search).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page
    .getByRole("combobox", { name: "Item category", exact: true })
    .click();
  await page.getByRole("option", { name: "Audio", exact: true }).click();
  await expect(page.locator(".directory-result-count")).toContainText("500 of");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await search.fill("does-not-exist");
  await expect(
    page.getByRole("heading", { name: "No matching records" }),
  ).toBeVisible();
  await page
    .locator(".empty-state")
    .getByRole("button", { name: "Clear filters" })
    .click();
  await page.getByRole("button", { name: "Add item", exact: false }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add items & services",
    exact: true,
  });
  await dialog.getByLabel("Name", { exact: true }).fill("Keep my work");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const confirm = page.getByRole("dialog", {
    name: "Discard record changes?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Keep my work",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await confirm
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await search.fill("TEST-1000");
  await page
    .getByRole("button", { name: "Edit Catalog fixture 1000", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText(
    "Changes saved successfully",
  );
  await page.keyboard.press("Control+k");
  const command = page.getByRole("dialog", {
    name: "Quick actions",
    exact: true,
  });
  await command.getByLabel("Find an action").fill("vendor pricing");
  await command.getByLabel("Find an action").press("ArrowDown");
  await expect(
    command.getByRole("link", { name: /Vendor pricing/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/master\/prices$/);
});

test("settings have reachable save actions and section navigation across phone and desktop", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/profile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("navigation", { name: "Company sections" })
      .getByRole("link", { name: /Bank accounts/ })
      .click();
    await expect(
      page.getByRole("button", { name: "Save profile", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("navigation", { name: "Company sections" })
    .getByRole("link", { name: /Company/ })
    .click();
  await page
    .getByLabel("Company name", { exact: true })
    .fill("UX Test Company");
  await expect(page.locator(".settings-save-state")).toContainText(
    "unsaved changes",
  );
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("Profile saved successfully.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeDisabled();
  for (const mode of ["Light mode", "Dark mode"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  }
});
