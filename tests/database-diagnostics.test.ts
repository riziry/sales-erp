import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseDiagnostic } from "../lib/db/diagnostics";
test("database deployment errors remain actionable without leaking SQL or credentials", () => {
  for (const [code, expected] of Object.entries({
    DATABASE_NOT_CONFIGURED: "DATABASE_NOT_CONFIGURED",
    ENOENT: "DATABASE_CERTIFICATE_FILE_MISSING",
    SELF_SIGNED_CERT_IN_CHAIN: "DATABASE_TLS_ERROR",
    ERR_TLS_CERT_ALTNAME_INVALID: "DATABASE_TLS_ERROR",
    "28P01": "DATABASE_CREDENTIALS_ERROR",
    "42P01": "DATABASE_MIGRATION_REQUIRED",
    "42703": "DATABASE_MIGRATION_REQUIRED",
    "42501": "DATABASE_PERMISSION_ERROR",
    ENETUNREACH: "DATABASE_CONNECTION_ERROR",
  })) {
    assert.equal(
      databaseDiagnostic({
        message: "SQL with private data",
        cause: { code, message: "secret credentials" },
      }),
      expected,
    );
  }
  assert.equal(
    databaseDiagnostic(
      new Error("Connection terminated due to connection timeout"),
    ),
    "DATABASE_CONNECTION_ERROR",
  );
  assert.equal(
    databaseDiagnostic({ message: "postgres://user:secret@private/db" }),
    "DATABASE_CHECK_FAILED",
  );
  const circular: { cause?: unknown } = {};
  circular.cause = circular;
  assert.equal(databaseDiagnostic(circular), "DATABASE_CHECK_FAILED");
});
