import "server-only";
import { createClient } from "@supabase/supabase-js";
import { allowedUserId, supabaseConfig } from "./config";

export async function getAllowedLoginUser(id: string) {
  if (id !== allowedUserId()) return null;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw Object.assign(new Error("Username sign-in is not configured."), {
      code: "SUPABASE_USERNAME_NOT_CONFIGURED",
    });
  const { url } = supabaseConfig();
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error)
    throw Object.assign(new Error("Username lookup unavailable."), {
      code: "SUPABASE_USERNAME_LOOKUP_FAILED",
    });
  return data.user;
}
