import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authProvider,
  allowedUserId,
  isAllowedUser,
  supabaseAuthMessage,
} from "../lib/supabase/config";

test("provider uses configured Supabase, with explicit internal mode for existing installs", () => {
  const oldProvider = process.env.AUTH_PROVIDER;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    delete process.env.AUTH_PROVIDER;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    assert.equal(authProvider(), "supabase");
    process.env.AUTH_PROVIDER = "internal";
    assert.equal(authProvider(), "internal");
  } finally {
    if (oldProvider === undefined) delete process.env.AUTH_PROVIDER;
    else process.env.AUTH_PROVIDER = oldProvider;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
  }
});
test("only the configured internal Auth account is authorized, including on server actions", () => {
  const old = process.env.SUPABASE_ALLOWED_USER_ID;
  try {
    process.env.SUPABASE_ALLOWED_USER_ID =
      "11111111-1111-4111-8111-111111111111";
    assert.equal(
      isAllowedUser({ id: process.env.SUPABASE_ALLOWED_USER_ID }),
      true,
    );
    assert.equal(
      isAllowedUser({ id: "22222222-2222-4222-8222-222222222222" }),
      false,
    );
    assert.equal(
      isAllowedUser({
        id: process.env.SUPABASE_ALLOWED_USER_ID,
        is_anonymous: true,
      }),
      false,
    );
    delete process.env.SUPABASE_ALLOWED_USER_ID;
    assert.throws(allowedUserId);
  } finally {
    if (old === undefined) delete process.env.SUPABASE_ALLOWED_USER_ID;
    else process.env.SUPABASE_ALLOWED_USER_ID = old;
  }
});
test("Supabase provider errors have safe, meaningful messages", () => {
  assert.match(
    supabaseAuthMessage({ code: "email_not_confirmed" }),
    /not been confirmed/,
  );
  assert.match(supabaseAuthMessage({ status: 429 }), /Too many/);
  assert.match(supabaseAuthMessage({ status: 503 }), /unavailable/);
  assert.match(
    supabaseAuthMessage({ code: "invalid_credentials", status: 400 }),
    /Incorrect email or password/,
  );
});
