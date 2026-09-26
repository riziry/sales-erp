import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { testDatabase } from "./database";
import { accountProfiles } from "../lib/db/schema";
import {
  loginIdentifier,
  matchesInternalLogin,
  resolveSupabaseLoginEmail,
} from "../lib/server/login-identity";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
before(async () => {
  fixture = await testDatabase();
});
after(async () => {
  await fixture?.close();
});
test("login identifiers normalize usernames and preserve email recovery without accepting malformed input", () => {
  assert.equal(loginIdentifier("  Sales.One  "), "sales.one");
  assert.equal(loginIdentifier(" FIRST@example.com "), "first@example.com");
  for (const value of [
    null,
    "",
    "ab",
    "a b c",
    "@example",
    "a".repeat(255),
    "user' OR 1=1",
  ])
    assert.equal(loginIdentifier(value), null);
});
test("internal username is tied to its account and updates immediately without losing email recovery", async () => {
  const db = fixture.db;
  await db
    .insert(accountProfiles)
    .values({
      id: "internal:1",
      username: "first.sales",
      name: "Test Sales",
      phone: "081234567890",
    });
  const user = { id: 1, email: "first@example.com" };
  assert.equal(await matchesInternalLogin(db, user, "first.sales"), true);
  assert.equal(
    await matchesInternalLogin(db, { ...user, id: 2 }, "first.sales"),
    false,
  );
  assert.equal(await matchesInternalLogin(db, user, "first@example.com"), true);
  await db
    .update(accountProfiles)
    .set({ username: "renamed.sales" })
    .where(eq(accountProfiles.id, "internal:1"));
  assert.equal(await matchesInternalLogin(db, user, "first.sales"), false);
  assert.equal(await matchesInternalLogin(db, user, "renamed.sales"), true);
});
test("Supabase username lookup restricts the Auth account and reads the latest confirmed email", async () => {
  const db = fixture.db;
  const allowed = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  await db.insert(accountProfiles).values([
    {
      id: `supabase:${allowed}`,
      username: "allowed.sales",
      name: "Allowed",
      phone: "081234567890",
    },
    {
      id: `supabase:${other}`,
      username: "other.sales",
      name: "Other",
      phone: "081234567890",
    },
  ]);
  let email = "current@example.com";
  const calls: string[] = [];
  const getUser = async (id: string) => {
    calls.push(id);
    return { id, email };
  };
  assert.equal(
    await resolveSupabaseLoginEmail(db, "other.sales", allowed, getUser),
    null,
  );
  assert.equal(
    await resolveSupabaseLoginEmail(db, "unknown", allowed, getUser),
    null,
  );
  assert.deepEqual(calls, []);
  assert.equal(
    await resolveSupabaseLoginEmail(db, "allowed.sales", allowed, getUser),
    email,
  );
  email = "changed@example.com";
  assert.equal(
    await resolveSupabaseLoginEmail(db, "allowed.sales", allowed, getUser),
    email,
  );
  assert.deepEqual(calls, [allowed, allowed]);
  assert.equal(
    await resolveSupabaseLoginEmail(db, "allowed.sales", allowed, async () => ({
      id: other,
      email,
    })),
    null,
  );
  assert.equal(
    await resolveSupabaseLoginEmail(db, "allowed.sales", allowed, async () => ({
      id: allowed,
      email,
      is_anonymous: true,
    })),
    null,
  );
  assert.equal(
    await resolveSupabaseLoginEmail(
      db,
      "allowed.sales",
      allowed,
      async () => null,
    ),
    null,
  );
  assert.equal(
    await resolveSupabaseLoginEmail(db, email, allowed, async () => {
      throw new Error("Email recovery must not require admin lookup");
    }),
    email,
  );
});
