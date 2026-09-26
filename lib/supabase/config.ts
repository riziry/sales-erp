export function authProvider(): "supabase" | "internal" {
  const provider = process.env.AUTH_PROVIDER;
  if (provider === "internal" || provider === "supabase") return provider;
  if (provider) throw new Error("Invalid AUTH_PROVIDER");
  return process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "internal";
}
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw Object.assign(new Error("Supabase Auth is not configured"), {
      code: "SUPABASE_NOT_CONFIGURED",
    });
  return { url, key };
}
export function allowedUserId() {
  const id = process.env.SUPABASE_ALLOWED_USER_ID;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id))
    throw Object.assign(
      new Error("The internal Supabase account has not been configured"),
      {
        code: "SUPABASE_USER_NOT_CONFIGURED",
      },
    );
  return id;
}
export function isAllowedUser(user: { id: string; is_anonymous?: boolean }) {
  return !user.is_anonymous && user.id === allowedUserId();
}
export function supabaseAuthMessage(error: { code?: string; status?: number }) {
  if (error.code === "email_not_confirmed")
    return "This email has not been confirmed. Confirm the account in Supabase Auth first.";
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return "Too many sign-in attempts. Please wait a moment and try again.";
  if (error.status && error.status >= 500)
    return "Supabase sign-in is temporarily unavailable. Please try again shortly.";
  return "Incorrect username or password.";
}
