"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/lib/server/actions";
import { ArrowRight, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { Notice } from "@/components/fields";
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return (
    <form
      noValidate
      action={action}
      className="stack login-form"
      aria-busy={pending}
    >
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
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
            placeholder="Enter your password"
            onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
            onKeyDown={(event) =>
              setCapsLock(event.getModifierState("CapsLock"))
            }
            onBlur={() => setCapsLock(false)}
            aria-describedby={capsLock ? "login-caps-lock" : undefined}
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
      {capsLock && (
        <p id="login-caps-lock" className="login-caps-lock" role="status">
          Caps Lock is on.
        </p>
      )}
      <Notice text={state.error} />
      <button className="button primary" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle size={18} className="login-spinner" /> Signing in…
          </>
        ) : (
          <>
            Sign in to workspace <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
