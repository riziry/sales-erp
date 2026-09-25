/** Return safe, actionable login errors without leaking queries or credentials. */
export function loginFailure(error: unknown): { code: string; error: string } {
  let current = error;
  let code = "UNKNOWN";
  for (
    let depth = 0;
    depth < 6 && current && typeof current === "object";
    depth++
  ) {
    const entry = current as { code?: unknown; cause?: unknown };
    if (typeof entry.code === "string") code = entry.code;
    current = entry.cause;
  }
  if (
    code === "SUPABASE_NOT_CONFIGURED" ||
    code === "SUPABASE_USER_NOT_CONFIGURED"
  ) {
    return {
      code,
      error:
        "Supabase sign-in is not ready. The administrator needs to configure the project and internal account.",
    };
  }
  if (code === "DATABASE_NOT_CONFIGURED") {
    return {
      code,
      error:
        "Sign-in is not ready: the application database connection is not configured. Contact the administrator to complete setup.",
    };
  }
  if (code === "42P01" || code === "42703") {
    return {
      code,
      error:
        "Sign-in is not ready: the database schema needs updating. The administrator must run database migrations.",
    };
  }
  return {
    code,
    error:
      "The sign-in service cannot connect. Try again once the connection is restored; your email and password could not be checked.",
  };
}
