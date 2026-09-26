/** Explicit live integration check. Creates and removes its own temporary Auth user.
 * Does not change existing users, passwords, profile data, or commercial documents.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
loadEnvConfig(process.cwd());
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.DATABASE_URL)
    throw new Error("Supabase configuration is incomplete.");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `yw-login-check-${randomBytes(8).toString("hex")}@example.invalid`;
  const password = randomBytes(24).toString("base64url");
  const nextPassword = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      `Could not create test account (${error?.code || "unknown"}).`,
    );
  const userId = data.user.id;
  let server: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3211"],
      {
        stdio: "pipe",
        env: {
          ...process.env,
          AUTH_PROVIDER: "supabase",
          SUPABASE_ALLOWED_USER_ID: userId,
        },
      },
    );
    // Drain logs without exposing Auth tokens or private connection details.
    server.stdout?.resume();
    server.stderr?.resume();
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch("http://localhost:3211/login")).ok) break;
      } catch {}
      if (server.exitCode !== null)
        throw new Error("The test server failed to start.");
      if (attempt === 99) throw new Error("The test server is not ready.");
      await new Promise((r) => setTimeout(r, 200));
    }
    browser = await chromium.launch();
    const page = await browser.newPage();
    const login = async (pw: string) => {
      await page.goto("http://localhost:3211/login");
      await page.getByLabel("Username", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(pw);
      await page.getByRole("button", { name: "Sign in to workspace" }).click();
    };
    await login("incorrect-password");
    await expect(page.locator('p[role="alert"]')).toContainText(
      "Incorrect username or password",
    );
    await login(password);
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Quotation", exact: false }),
    ).toBeVisible();
    const cookies = await page.context().cookies();
    expect(
      cookies.some(
        (c) => c.name.includes("auth-token") && c.httpOnly && c.secure,
      ),
    ).toBe(true);
    for (const path of [
      "/master/items",
      "/master/packages",
      "/quotation/new",
      "/profile",
    ]) {
      await page.goto(`http://localhost:3211${path}`);
      await expect(page.locator(".content")).toBeVisible();
      await expect(
        page.getByText("This page could not be loaded."),
      ).toHaveCount(0);
    }
    await page.goto("http://localhost:3211/account");
    await page.getByLabel("Current password", { exact: true }).fill(password);
    await page
      .getByLabel("New password (at least 12 characters)", { exact: true })
      .fill(nextPassword);
    await page
      .getByRole("button", { name: "Change password & sign out" })
      .click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await login(nextPassword);
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("http://localhost:3211/quotation");
    await expect(page).toHaveURL(/\/login$/);
    // This temporary account must not have access to the user's actual workspace.
    const ownPage = await browser.newPage();
    await ownPage.goto("http://localhost:3000/login");
    await ownPage.getByLabel("Username", { exact: true }).fill(email);
    await ownPage.getByLabel("Password", { exact: true }).fill(nextPassword);
    await ownPage.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(ownPage.locator('p[role="alert"]')).toContainText(
      "does not have access",
      { timeout: 30_000 },
    );
    await ownPage.goto("http://localhost:3000/quotation");
    await expect(ownPage).toHaveURL(/\/login$/);
    await mkdir("test-results", { recursive: true });
    console.log(
      "PASS: real Supabase password login, internal account restriction, authenticated quotation/master/profile pages, password change, HttpOnly cookies, and logout.",
    );
  } finally {
    await browser?.close();
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error)
      throw new Error(
        "The test account could not be removed; delete the account starting with yw-login-check in Supabase.",
      );
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Verification failed");
  process.exitCode = 1;
});
