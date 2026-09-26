"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/lib/server/actions";
import { Eye, EyeOff } from "lucide-react";
import { Notice } from "@/components/fields";
export default function LoginForm() {
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return (
    <form noValidate action={action} className="stack">
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder="you@company.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <span className="password-control">
          <input
            type={visible ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>
      <Notice text={state.error} />
      <button className="button primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to workspace →"}
      </button>
      <small className="muted">Internal account access only.</small>
    </form>
  );
}
