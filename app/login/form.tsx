"use client";
import { useActionState } from "react";
import { loginAction } from "@/lib/server/actions";
import { Notice } from "@/components/fields";
export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder="name@ywproduction.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      <Notice text={state.error} />
      <button className="button primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to workspace →"}
      </button>
      <small className="muted">Internal account access only.</small>
    </form>
  );
}
