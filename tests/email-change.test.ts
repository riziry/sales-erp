import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  changeInternalEmail,
  changeSupabaseEmail,
  emailChangeSchema,
} from "../lib/server/email-change";
import { hashPassword } from "../lib/server/password";
import { users, sessions } from "../lib/db/schema";
import { testDatabase } from "./database";
let fixture: Awaited<ReturnType<typeof testDatabase>>;
const password = "test-password-for-email";
before(async () => {
  fixture = await testDatabase();
  await fixture.db
    .insert(users)
    .values({
      id: 1,
      email: "old@example.com",
      passwordHash: hashPassword(password),
    });
});
after(async () => {
  await fixture?.close();
});

test("email validation normalizes input, rejects invalid emails and empty passwords", () => {
  assert.equal(
    emailChangeSchema.parse({ email: "  New@Example.com ", password }).email,
    "new@example.com",
  );
  assert.equal(
    emailChangeSchema.safeParse({ email: "invalid", password }).success,
    false,
  );
  assert.equal(
    emailChangeSchema.safeParse({ email: "new@example.com", password: "" })
      .success,
    false,
  );
});
test("internal email changes require the current password and atomically revoke sessions", async () => {
  await fixture.db
    .insert(sessions)
    .values({
      userId: 1,
      tokenHash: "test-session",
      expiresAt: new Date(Date.now() + 60000),
    });
  assert.equal(
    (
      await changeInternalEmail(fixture.db, 1, {
        email: "new@example.com",
        password: "wrong",
      })
    ).ok,
    false,
  );
  assert.equal(
    (await fixture.db.select().from(users))[0].email,
    "old@example.com",
  );
  assert.equal((await fixture.db.select().from(sessions)).length, 1);
  assert.equal(
    (
      await changeInternalEmail(fixture.db, 1, {
        email: "old@example.com",
        password,
      })
    ).ok,
    false,
  );
  assert.deepEqual(
    await changeInternalEmail(fixture.db, 1, {
      email: " New@Example.com ",
      password,
    }),
    { ok: true, status: "changed", email: "new@example.com" },
  );
  assert.equal((await fixture.db.select().from(sessions)).length, 0);
  const [user] = await fixture.db.select().from(users);
  assert.equal(user.email, "new@example.com");
  assert.equal(user.failedAttempts, 0);
});
test("repeated incorrect current passwords lock email changes", async () => {
  for (let i = 0; i < 5; i++)
    await changeInternalEmail(fixture.db, 1, {
      email: "blocked@example.com",
      password: "wrong",
    });
  assert.equal(
    (
      await changeInternalEmail(fixture.db, 1, {
        email: "blocked@example.com",
        password,
      })
    ).ok,
    false,
  );
  const [user] = await fixture.db.select().from(users).where(eq(users.id, 1));
  assert.ok(user.lockedUntil && user.lockedUntil > new Date());
  assert.equal(user.email, "new@example.com");
});

function provider(
  options: {
    immediate?: boolean;
    wrong?: boolean;
    differentUser?: boolean;
    error?: number;
    same?: boolean;
    anonymous?: boolean;
  } = {},
) {
  const user = {
    id: "allowed-id",
    email: "old@example.com",
    is_anonymous: !!options.anonymous,
  } as User;
  let updates = 0;
  let signedOut = 0;
  const auth = {
    getUser: async () => ({ data: { user }, error: null }),
    updateUser: async (
      attributes: { email?: string },
      config?: { emailRedirectTo?: string },
    ) => {
      updates++;
      assert.equal(attributes.email, "new@example.com");
      assert.equal(
        config?.emailRedirectTo,
        "https://app.example.com/auth/email-change",
      );
      if (options.error)
        return { data: { user: null }, error: { status: options.error } };
      return {
        data: {
          user: {
            ...user,
            email: options.immediate ? attributes.email : user.email,
            new_email: options.immediate ? "" : attributes.email,
          },
        },
        error: null,
      };
    },
  } as Pick<SupabaseClient["auth"], "getUser" | "updateUser">;
  const verifier = {
    signInWithPassword: async (credentials: {
      email: string;
      password: string;
    }) => {
      assert.equal(credentials.email, "old@example.com");
      assert.equal(credentials.password, password);
      return options.wrong
        ? { data: { user: null, session: null }, error: { status: 400 } }
        : {
            data: {
              user: {
                ...user,
                id: options.differentUser ? "someone-else" : user.id,
              },
              session: {},
            },
            error: null,
          };
    },
    signOut: async (scope: { scope?: string }) => {
      assert.equal(scope.scope, "local");
      signedOut++;
      return { error: null };
    },
  } as Pick<SupabaseClient["auth"], "signInWithPassword" | "signOut">;
  return {
    run: () =>
      changeSupabaseEmail(
        auth,
        verifier,
        user.id,
        { email: options.same ? user.email : "new@example.com", password },
        "https://app.example.com/auth/email-change",
      ),
    updates: () => updates,
    signedOut: () => signedOut,
  };
}
test("Supabase reports pending confirmation instead of claiming the email changed", async () => {
  const mock = provider();
  assert.deepEqual(await mock.run(), {
    ok: true,
    status: "pending",
    email: "new@example.com",
  });
  assert.equal(mock.updates(), 1);
  assert.equal(mock.signedOut(), 1);
  assert.deepEqual(await provider({ immediate: true }).run(), {
    ok: true,
    status: "changed",
    email: "new@example.com",
  });
});
test("Supabase does not update for bad passwords, mismatched identities, anonymous sessions, or same email", async () => {
  for (const options of [
    { wrong: true },
    { differentUser: true },
    { anonymous: true },
    { same: true },
  ]) {
    const mock = provider(options);
    assert.equal((await mock.run()).ok, false);
    assert.equal(mock.updates(), 0);
  }
});
test("Supabase email delivery and rate-limit errors remain recoverable", async () => {
  for (const error of [422, 429, 500])
    assert.equal((await provider({ error }).run()).ok, false);
});
