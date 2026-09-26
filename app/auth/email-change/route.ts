import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authProvider, isAllowedUser } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (authProvider() !== "supabase") return go("/login");
  try {
    const auth = (await supabaseServer()).auth;
    const code = request.nextUrl.searchParams.get("code");
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    if (request.nextUrl.searchParams.has("error"))
      return go("/login?emailChange=review");
    if (code) {
      const { data, error } = await auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (error) return go("/login?emailChange=review");
      if (!data.user || !isAllowedUser(data.user)) {
        await auth.signOut({ scope: "local" });
        return go("/login");
      }
    }
    const {
      data: { user },
    } = await auth.getUser();
    if (user && isAllowedUser(user)) return go("/account");
  } catch {
    /* Show recovery instructions without exposing provider details. */
  }
  return go("/login?emailChange=review");
}
