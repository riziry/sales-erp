import { watchRenderingWarnings } from "./rendering-warnings";
import { test, expect } from "@playwright/test";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
test("account details and signature upload appear on quotation and invoice snapshots, with client approval space", async ({
  page,
}) => {
  const checkRenderingWarnings = watchRenderingWarnings(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await expect(page.getByLabel("Sign-in email", { exact: true })).toHaveValue(
    "test@yw.local",
  );
  await page.getByLabel("Username", { exact: true }).fill("sales.test");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Sales");
  await page
    .getByLabel("Role / job title", { exact: true })
    .fill("Sales Executive");
  await page.getByLabel("Phone number", { exact: true }).fill("081234567890");
  const buffer = await sharp({
    create: { width: 300, height: 80, channels: 4, background: "transparent" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="300" height="80"><path d="M10 55 Q50 5 80 55 T150 40 L220 20 L190 60 L280 50" fill="none" stroke="black" stroke-width="3"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
  await page
    .getByLabel("Signature image", { exact: true })
    .setInputFiles({ name: "signature.png", mimeType: "image/png", buffer });
  await expect(
    page.getByAltText("Signature preview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Sales",
  );
  await expect(
    page.getByAltText("Signature preview", { exact: true }),
  ).toBeVisible();
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
    path: "test-results/account-phone.png",
    fullPage: true,
  });
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Signature Client");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Signature document test");
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page.getByLabel("Item name", { exact: true }).fill("Event service");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("1000000");
  await page.getByLabel("Cost per unit", { exact: true }).fill("500000");
  const bar = page.getByRole("region", {
    name: "Document quick actions",
    exact: true,
  });
  await expect(bar).toBeInViewport();
  await bar.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  const quoteUrl = page.url();
  await page.goto(quoteUrl + "/print");
  await expect(page.locator(".sales-signature")).toContainText("Alex Sales");
  await expect(page.locator(".sales-role")).toHaveText("Sales Executive");
  await expect(page.locator(".sales-signature")).toContainText("081234567890");
  await expect(page.locator(".client-signature")).toContainText(
    "Client approval",
  );
  await expect(page.locator(".client-signature")).toContainText("Name:");
  await expect(page.locator(".client-signature")).toContainText("Contact:");
  await expect(page.getByAltText("Signature of Alex Sales")).toBeVisible();
  await page.pdf({
    path: "test-results/quotation-signature.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.goto(quoteUrl);
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  const invoiceUrl = page.url();
  await page.goto("/account");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Updated");
  await page
    .getByLabel("Role / job title", { exact: true })
    .fill("Sales Manager");
  await page.getByLabel("Phone number", { exact: true }).fill("089999999999");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  await page.goto(invoiceUrl + "/print");
  await expect(page.locator(".sales-signature")).toContainText("Alex Sales");
  await expect(page.locator(".sales-role")).toHaveText("Sales Executive");
  await expect(page.getByAltText("Signature of Alex Sales")).toBeVisible();
  await expect(page.locator(".client-signature")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/invoice-signature-phone.png",
    fullPage: true,
  });
  await page.goto(quoteUrl + "/print");
  await expect(page.getByAltText("Signature of Alex Sales")).toBeVisible();
  await page.goto(quoteUrl);
  await page
    .getByRole("button", {
      name: "Use my current account details",
      exact: true,
    })
    .click();
  await bar.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".save-indicator")).toContainText(
    "All changes saved",
  );
  await page.goto(quoteUrl + "/print");
  await expect(page.locator(".sales-signature")).toContainText("Alex Updated");
  await expect(page.locator(".sales-role")).toHaveText("Sales Manager");
  await expect(page.locator(".sales-signature img")).toHaveCount(0);
  // A stale authenticated form cannot upload after its session is removed.
  await page.goto("/account");
  await page
    .getByLabel("Signature image", { exact: true })
    .setInputFiles({ name: "signature.png", mimeType: "image/png", buffer });
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await checkRenderingWarnings();
});

test("draw a signature with mouse and touch, undo, clear, cancel and persist it", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await page
    .getByRole("button", { name: "Draw signature", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Draw your signature" });
  const use = dialog.getByRole("button", {
    name: "Use signature",
    exact: true,
  });
  await expect(use).toBeDisabled();
  const canvas = dialog.getByLabel("Signature drawing area");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 25, { steps: 12 });
  await page.mouse.move(box.x + 160, box.y + 80, { steps: 12 });
  await page.mouse.up();
  await expect(use).toBeEnabled();
  await dialog.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(use).toBeDisabled();
  // A real Chromium touch stream verifies pointer capture and touch-action.
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas.scrollIntoViewIfNeeded();
  const touch = await page.context().newCDPSession(page);
  async function drawTouch() {
    const rect = (await canvas.boundingBox())!;
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: rect.x + 25, y: rect.y + 55, id: 1 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: rect.x + 85, y: rect.y + 25, id: 1 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: rect.x + 170, y: rect.y + 70, id: 1 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await drawTouch();
  await expect(use).toBeEnabled();
  await dialog.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(use).toBeDisabled();
  await drawTouch();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(use).toBeEnabled();
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) =>
    Array.from(node.getContext("2d")!.getImageData(0, 0, 800, 320).data)
      .filter((_, i) => i % 4 === 3)
      .some((value) => value > 0),
  );
  expect(pixels).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/signature-draw-phone.png",
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await use.click();
  await expect(dialog).toHaveCount(0);
  const preview = page.getByAltText("Signature preview", { exact: true });
  const image = await preview.getAttribute("src");
  await page
    .getByRole("button", { name: "Draw signature", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(preview).toHaveAttribute("src", image!);
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(preview).toHaveAttribute("src", /^data:image\/png;base64,/);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Change password", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("change email requires the current password and the new address works at login", async ({
  page,
}) => {
  const password = "test-internal-password";
  async function login(email: string) {
    await page.goto("/login");
    await page.getByLabel("Username", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
  }
  async function change(email: string, current: string) {
    await page.getByLabel("New sign-in email", { exact: true }).fill(email);
    await page
      .getByLabel("Current password to change email", { exact: true })
      .fill(current);
    await page
      .getByRole("button", { name: "Update sign-in email", exact: true })
      .click();
  }
  await login("test@yw.local");
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await change("not-an-email", password);
  await expect(
    page.getByText("Enter a valid email address.", { exact: true }),
  ).toBeVisible();
  await change("changed@yw.local", "wrong-password");
  await expect(
    page.getByText(
      "The current password is incorrect or the account is temporarily locked.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Sign-in email", { exact: true })).toHaveValue(
    "test@yw.local",
  );
  await change("changed@yw.local", password);
  await expect(page).toHaveURL(/\/login\?emailChange=changed$/);
  await expect(
    page.getByText(
      "Email updated. Sign in with your username or new email and existing password.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  await login("test@yw.local");
  await expect(page.getByText(/Incorrect username\/password/)).toBeVisible();
  await login("changed@yw.local");
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await expect(page.getByLabel("Sign-in email", { exact: true })).toHaveValue(
    "changed@yw.local",
  );
  // Restore only the disposable test account for the remaining test files.
  await change("test@yw.local", password);
  await expect(page).toHaveURL(/\/login\?emailChange=changed$/);
  await login("test@yw.local");
  await expect(page).toHaveURL(/\/quotation$/);
});
