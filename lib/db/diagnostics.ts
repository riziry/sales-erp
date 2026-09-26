/** Return only actionable codes, never SQL, credentials, or customer data. */
export function databaseDiagnostic(error: unknown) {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const value = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    const code = typeof value.code === "string" ? value.code : "";
    if (code === "DATABASE_NOT_CONFIGURED") return "DATABASE_NOT_CONFIGURED";
    if (code === "ENOENT") return "DATABASE_CERTIFICATE_FILE_MISSING";
    if (
      [
        "SELF_SIGNED_CERT_IN_CHAIN",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "CERT_HAS_EXPIRED",
        "ERR_TLS_CERT_ALTNAME_INVALID",
        "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      ].includes(code)
    )
      return "DATABASE_TLS_ERROR";
    if (["28P01", "28000"].includes(code)) return "DATABASE_CREDENTIALS_ERROR";
    if (["42P01", "42703"].includes(code)) return "DATABASE_MIGRATION_REQUIRED";
    if (code === "42501") return "DATABASE_PERMISSION_ERROR";
    if (
      [
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
        "ENETUNREACH",
        "EHOSTUNREACH",
        "ECONNRESET",
        "53300",
      ].includes(code)
    )
      return "DATABASE_CONNECTION_ERROR";
    if (
      typeof value.message === "string" &&
      /connection.*timeout|timeout.*connection/i.test(value.message)
    )
      return "DATABASE_CONNECTION_ERROR";
    current = value.cause;
  }
  return "DATABASE_CHECK_FAILED";
}
