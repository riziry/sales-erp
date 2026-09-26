/** Explicit live Auth test: uses a disposable Auth user and local temporary DB. */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { testDatabase } from "../tests/database";
loadEnvConfig(process.cwd());
async function main() {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("Set the server-side Supabase configuration first.");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const marker = randomBytes(8).toString("hex");
  const email = `sales-erp-username-${marker}@example.invalid`;
  const password = randomBytes(24).toString("base64url");
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error("Unable to create disposable Auth test user.");
  const id = created.data.user.id;
  let db: Awaited<ReturnType<typeof testDatabase>> | undefined;
  let server: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    db = await testDatabase();
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3212"],
      {
        stdio: "ignore",
        env: {
          ...process.env,
          DATABASE_URL: db.url,
          AUTH_PROVIDER: "supabase",
          SUPABASE_ALLOWED_USER_ID: id,
        },
      },
    );
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch("http://localhost:3212/login")).ok) break;
      } catch {}
      if (server.exitCode !== null || attempt === 99)
        throw new Error("Test server unavailable.");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    browser = await chromium.launch();
    const page = await browser.newPage();
    async function login(identifier: string, secret = password) {
      await page.goto("http://localhost:3212/login");
      await page.getByLabel("Username", { exact: true }).fill(identifier);
      await page.getByLabel("Password", { exact: true }).fill(secret);
      await page.getByRole("button", { name: "Sign in to workspace" }).click();
    }
    await login(email);
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    await page.goto("http://localhost:3212/account");
    await page.getByLabel("Username", { exact: true }).fill("fixture.sales");
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Disposable Sales");
    await page.getByLabel("Phone number", { exact: true }).fill("081234567890");
    await page
      .getByRole("button", { name: "Save account", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Save account", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login("fixture.sales", "incorrect-password");
    await expect(page.locator('p[role="alert"]')).toContainText(
      "Incorrect username or password",
    );
    await login("  FIXTURE.SALES  ");
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    expect(
      (await page.context().cookies()).some(
        (c) => c.name.includes("auth-token") && c.httpOnly && c.secure,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    const changed = await admin.auth.admin.updateUserById(id, {
      email: `sales-erp-changed-${marker}@example.invalid`,
      email_confirm: true,
    });
    if (changed.error) throw new Error("Test email update failed.");
    await login("fixture.sales");
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    await page.goto("http://localhost:3212/account");
    await page.getByLabel("Username", { exact: true }).fill("renamed.sales");
    await page
      .getByRole("button", { name: "Save account", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Save account", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login("fixture.sales");
    await expect(page.locator('p[role="alert"]')).toContainText(
      "Incorrect username or password",
    );
    await login("renamed.sales");
    await expect(page).toHaveURL(/\/quotation$/, { timeout: 30_000 });
    console.log(
      "PASS: real Supabase username/password login, incorrect credentials, normalized usernames, email changes, username changes, and secure cookies.",
    );
  } finally {
    await browser?.close();
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    await db?.close();
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error)
      throw new Error(
        "Remove the disposable sales-erp-username Auth test account; automatic cleanup failed.",
      );
  }
}
main().catch(() => {
  console.error(
    "Username integration check failed; inspect configuration. Sensitive test details omitted.",
  );
  process.exitCode = 1;
});
