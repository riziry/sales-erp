import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { selectOption } from "./controls";
test("custom controls format prices, support keyboard and nested dialogs, and sales tasks survive duplication", async ({
  page,
  request,
}) => {
  await page.goto("/sales");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(".app-wordmark")).toContainText("sales-erp");
  await page.getByLabel("Email", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Sales testing customer");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Sales testing offer");
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page.getByLabel("Item name", { exact: true }).fill("Consulting");
  const price = page.getByLabel("Selling price per unit", { exact: true });
  await price.fill("");
  await price.pressSequentially("100000");
  await expect(price).toHaveValue("100.000");
  await price.press("End");
  await price.pressSequentially(",50");
  await expect(price).toHaveValue("100.000,50");
  await price.fill("100000");
  await price.press("Home");
  await price.press("ArrowRight");
  await price.pressSequentially("2");
  await expect(price).toHaveValue("1.200.000");
  await price.press("Backspace");
  await expect(price).toHaveValue("100.000");
  await price.press("Home");
  for (let i = 0; i < 4; i++) await price.press("ArrowRight");
  await price.press("Backspace");
  await expect(price).toHaveValue("10.000");
  await price.fill("100000");
  await page.getByLabel("Cost per unit", { exact: true }).fill("25000");
  await expect(page.getByLabel("Cost per unit", { exact: true })).toHaveValue(
    "25.000",
  );
  await page.getByRole("button", { name: "Increase qty", exact: true }).click();
  await expect(page.getByLabel("Qty", { exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Decrease qty", exact: true }).click();
  await selectOption(page, "Selling price basis", "Once / event");
  const basis = page.getByRole("combobox", { name: "Cost basis", exact: true });
  await basis.focus();
  await basis.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Per day", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Once / event", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(basis).toContainText("Once / event");
  await page
    .getByRole("button", { name: "Choose event dates", exact: true })
    .click();
  await expect(page.locator(".calendar-popover")).toBeVisible();
  await page
    .locator(".calendar-popover")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await expect(
    page.getByLabel("Event start date", { exact: true }),
  ).not.toHaveValue("");
  await expect(
    page.locator(
      'select:visible, input[type="number"]:visible, input[type="date"]:visible',
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  const original = page.url();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page).not.toHaveURL(original);
  await expect(page.getByLabel("Event / project", { exact: true })).toHaveValue(
    "Copy of Sales testing offer",
  );
  await expect(
    page.getByLabel("Event start date", { exact: true }),
  ).toHaveValue("");
  await expect(price).toHaveValue("100.000");
  await page.goto(original);
  await expect(page.getByLabel("Event / project", { exact: true })).toHaveValue(
    "Sales testing offer",
  );
  await page.keyboard.press("ControlOrMeta+k");
  const actions = page.getByRole("dialog", {
    name: "Quick actions",
    exact: true,
  });
  await actions
    .getByLabel("Find an action", { exact: true })
    .fill("Sales overview");
  await actions.getByRole("link").click();
  await expect(page).toHaveURL(/\/sales$/);
  await page
    .getByRole("button", { name: "Schedule follow-up", exact: true })
    .click();
  const followup = page.getByRole("dialog", {
    name: "Schedule a follow-up",
    exact: true,
  });
  await followup
    .getByRole("button", { name: "Quotation to follow up", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Quotation to follow up",
    exact: true,
  });
  await picker.getByRole("combobox").fill("Sales testing");
  await picker.getByRole("option").last().click();
  await followup
    .getByRole("button", { name: "Choose follow-up date", exact: true })
    .click();
  await page
    .locator(".calendar-popover")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await followup
    .getByLabel("Next step", { exact: true })
    .fill("Call about the proposal");
  const outgoing = page.waitForRequest(
    (r) => r.method() === "POST" && !!r.headers()["next-action"],
  );
  await followup
    .getByRole("button", { name: "Schedule follow-up", exact: true })
    .click();
  const action = await outgoing;
  await expect(followup).not.toBeVisible();
  await expect(page.locator(".task-list")).toContainText(
    "Call about the proposal",
  );
  const replay = await request.post("/sales", {
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
    .getByRole("button", {
      name: "Complete Call about the proposal",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.locator(".task-list")).toContainText(
    "Call about the proposal",
  );
  await page
    .getByRole("button", {
      name: "Reopen Call about the proposal",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".task-list")).toContainText(
    "Call about the proposal",
  );
  for (const theme of ["Light mode", "Dark mode"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      );
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.screenshot({
    path: "test-results/sales-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/sales-mobile.png",
    fullPage: true,
  });
});

test("nested custom select and calendar preserve modal focus; quick actions honor unsaved edits", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/master/items");
  await page.getByRole("button", { name: "Add item", exact: false }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add items & services",
    exact: true,
  });
  const select = page.getByRole("combobox", {
    name: "Internal cost basis",
    exact: true,
  });
  await select.click();
  await expect(
    page.getByRole("option", { name: "Once / event", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await selectOption(page, "Internal cost basis", "Once / event");
  await expect(select).toContainText("Once / event");
  await page.screenshot({ path: "test-results/custom-master-controls.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.goto("/quotation/new");
  await page
    .getByRole("button", { name: "Choose quotation date", exact: true })
    .click();
  const calendar = page.locator(".calendar-popover");
  await expect(calendar).toBeVisible();
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "test-results/custom-calendar.png" });
  await page.keyboard.press("Escape");
  await expect(calendar).not.toBeVisible();
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Unsaved draft");
  await page.keyboard.press("ControlOrMeta+k");
  const actions = page.getByRole("dialog", {
    name: "Quick actions",
    exact: true,
  });
  await actions
    .getByLabel("Find an action", { exact: true })
    .fill("Sales overview");
  await actions.getByRole("link").click();
  const confirm = page.getByRole("dialog", {
    name: "Leave without saving?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await confirm
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sales$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
