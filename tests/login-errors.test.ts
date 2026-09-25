import { test } from "node:test";
import assert from "node:assert/strict";
import { loginFailure } from "../lib/server/login-errors";

test("missing login database is a configuration error, not bad credentials", () => {
  const result = loginFailure({ code: "DATABASE_NOT_CONFIGURED" });
  assert.match(result.error, /not configured/);
});

test("nested missing-table errors identify pending migrations", () => {
  const result = loginFailure({
    message: "SQL with private parameters",
    cause: { code: "42P01" },
  });
  assert.match(result.error, /migrations/);
  assert.ok(!result.error.includes("SQL"));
});

test("connection and unknown errors never expose backend details", () => {
  for (const error of [
    new Error("secret database password"),
    { code: "ECONNREFUSED", message: "postgresql://private:secret@host" },
  ]) {
    const result = loginFailure(error);
    assert.match(result.error, /could not be checked/);
    assert.ok(!result.error.includes("secret"));
    assert.ok(!result.error.includes("postgresql"));
  }
});
