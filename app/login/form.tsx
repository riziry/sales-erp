"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/lib/server/actions";
import { ArrowRight, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { Notice } from "@/components/fields";
export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [useEmail, setUseEmail] = useState(false);
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
        <span>{useEmail ? "Email" : "Username"}</span>
        <input
          type={useEmail ? "email" : "text"}
          name="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          readOnly={pending}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder={useEmail ? "you@company.com" : "Your username"}
        />
      </label>
      <label className="field">
        <span>Password</span>
        <span className="password-control">
          <input
            type={visible ? "text" : "password"}
            name="password"
            readOnly={pending}
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
            disabled={pending}
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
      <div className="login-method">
        <button
          type="button"
          disabled={pending}
          onClick={() => setUseEmail(!useEmail)}
        >
          {useEmail ? "Use username instead" : "Use email instead"}
        </button>
        <p>
          {useEmail
            ? "Use your account email for initial setup or if you forgot your username."
            : "Use the username saved in My account."}
        </p>
      </div>
    </form>
  );
}
