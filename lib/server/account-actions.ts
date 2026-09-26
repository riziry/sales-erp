"use server";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { database } from "../db";
import { COOKIE, requireUser } from "./auth";
import { accountKey, normalizeSignature, saveAccountProfile } from "./accounts";
import { supabaseServer } from "../supabase/server";
import { supabaseConfig } from "../supabase/config";
import {
  changeInternalEmail,
  changeSupabaseEmail,
  emailChangeSchema,
  type EmailChangeResult,
} from "./email-change";

export async function changeEmailAction(
  email: string,
  password: string,
): Promise<EmailChangeResult> {
  const user = await requireUser();
  try {
    const input = emailChangeSchema.parse({ email, password });
    if (typeof user === "string") {
      const origin = (await headers()).get("origin");
      if (!origin || !/^https?:\/\//.test(origin))
        return { ok: false, error: "Refresh this page and try again." };
      const { url, key } = supabaseConfig();
      const verifier = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const result = await changeSupabaseEmail(
        (await supabaseServer()).auth,
        verifier.auth,
        user,
        input,
        new URL("/auth/email-change", origin).toString(),
      );
      if (result.ok) revalidatePath("/account");
      return result;
    }
    const result = await changeInternalEmail(database(), user, input);
    if (!result.ok) return result;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : "Unable to update your email. Please try again shortly.",
    };
  }
  (await cookies()).delete(COOKIE);
  redirect("/login?emailChange=changed");
}
export async function saveAccountAction(form: FormData) {
  const user = await requireUser();
  try {
    const file = form.get("signature");
    let signature: string | null | undefined =
      form.get("removeSignature") === "yes" ? null : undefined;
    if (file instanceof File && file.size)
      signature = await normalizeSignature(
        Buffer.from(await file.arrayBuffer()),
        file.type,
      );
    await saveAccountProfile(
      database(),
      accountKey(user),
      {
        username: form.get("username"),
        name: form.get("name"),
        phone: form.get("phone"),
      },
      Number(form.get("version")),
      signature,
    );
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("\n")
          : error instanceof Error &&
              !error.message.startsWith("Failed query:") &&
              !("code" in error)
            ? error.message
            : "Unable to save your account. Please try again.",
    };
  }
}
