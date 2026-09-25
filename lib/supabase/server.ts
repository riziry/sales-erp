import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function supabaseServer() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Refresh cookies are written by proxy during Server Component renders.
        // Actions can write them directly when signing in/out or changing passwords.
        try {
          for (const { name, value, options } of values)
            store.set(name, value, options);
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes("Cookies can only be modified")
          )
            throw error;
        }
      },
    },
  });
}
