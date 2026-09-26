import { eq } from "drizzle-orm";
import { database } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/server/auth";
import { accountKey, accountProfile } from "@/lib/server/accounts";
import { supabaseServer } from "@/lib/supabase/server";
import AccountEditor from "@/components/account-editor";
export default async function AccountPage() {
  const user = await requireUser();
  const db = database();
  const account = await accountProfile(db, accountKey(user));
  let email = "";
  let pendingEmail = "";
  if (typeof user === "number") {
    const [record] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, user));
    email = record?.email || "";
  } else {
    const { data } = await (await supabaseServer()).auth.getUser();
    email = data.user?.email || "";
    pendingEmail = data.user?.new_email || "";
  }
  return (
    <AccountEditor
      key={account?.version || 0}
      initial={account}
      email={email}
      pendingEmail={pendingEmail}
    />
  );
}
