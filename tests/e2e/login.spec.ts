import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("branded login supports phone/tablet layouts, themes, motion preferences, and keyboard sign in", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator(".app-logo img")).toBeVisible();
  const icon = await page
    .locator('link[rel="icon"]')
    .first()
    .getAttribute("href");
  expect(icon).toContain("favicon.ico");
  const response = await page.request.get(icon!);
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.readUInt16LE(2)).toBe(1);
  expect(bytes[6]).toBe(64);
  for (const theme of ["Light mode", "Dark mode"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Sign in to workspace" }),
      ).toBeInViewport();
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(
      await page
        .locator(".login-preview")
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
    await page.screenshot({
      path: `test-results/login-${theme.split(" ")[0].toLowerCase()}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  expect(
    await page
      .locator(".login-preview")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("login-document-enter");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/login-phone.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator(".login-form .notice")).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill("invalid-address");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-submitted-to-auth");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator(".login-form .notice")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "invalid-address",
  );
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("test-internal-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await password.press("Enter");
  await expect(page).toHaveURL(/\/quotation$/);
});

test("username and password login follows account edits and confirmed email changes", async ({
  page,
}) => {
  const password = "test-internal-password";
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Use email instead", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("test@yw.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await page.getByLabel("Username", { exact: true }).fill("login.sales");
  await page.getByLabel("Full name", { exact: true }).fill("Login Sales");
  await page.getByLabel("Phone number", { exact: true }).fill("081234567890");
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  async function logout() {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  }
  async function login(username: string, secret = password) {
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(secret);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page.locator('.login-form[aria-busy="true"]')).toHaveCount(0);
  }
  await logout();
  await login("  LOGIN.SALES  ");
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await page.getByLabel("Username", { exact: true }).fill("renamed.sales");
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  await logout();
  await login("login.sales");
  await expect(page.locator(".login-form .notice")).toContainText(
    "Incorrect username/password",
  );
  await login("renamed.sales", "wrong-password");
  await expect(page.locator(".login-form .notice")).toContainText(
    "Incorrect username/password",
  );
  await login("renamed.sales");
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  async function changeEmail(email: string) {
    await page.getByLabel("New sign-in email", { exact: true }).fill(email);
    await page
      .getByLabel("Current password to change email", { exact: true })
      .fill(password);
    await page
      .getByRole("button", { name: "Update sign-in email", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login\?emailChange=changed$/);
  }
  await changeEmail("username-login@example.test");
  await login("renamed.sales");
  await expect(page).toHaveURL(/\/quotation$/);
  await page.goto("/account");
  await expect(page.getByLabel("Sign-in email", { exact: true })).toHaveValue(
    "username-login@example.test",
  );
  await changeEmail("test@yw.local");
});
