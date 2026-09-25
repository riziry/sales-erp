import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { database } from "../db";
import { sessions } from "../db/schema";
import { tokenHash } from "./password";
import { authProvider, isAllowedUser } from "../supabase/config";
import { supabaseServer } from "../supabase/server";
export const COOKIE = "yw_session";
export async function requireUser() {
  if (authProvider() === "supabase") {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !isAllowedUser(data.user)) redirect("/login");
    return data.user.id;
  }
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) redirect("/login");
  const [session] = await database()
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  if (!session) redirect("/login");
  return session.userId;
}
