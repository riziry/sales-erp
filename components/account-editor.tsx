"use client";
import SectionNavigation from "./section-navigation";
import DocumentImage from "./document-image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, PenLine, Trash2, UserRound } from "lucide-react";
import { Field, Notice } from "./fields";
import { useUI } from "./ui-provider";
import { useUnsavedChanges } from "./use-unsaved-changes";
import {
  changeEmailAction,
  saveAccountAction,
} from "@/lib/server/account-actions";
import { passwordAction } from "@/lib/server/actions";
import type { AccountProfile } from "@/lib/domain/account";
import SignatureDrawer from "./signature-drawer";
export default function AccountEditor({
  initial,
  email,
  pendingEmail = "",
}: {
  initial: AccountProfile | null;
  email: string;
  pendingEmail?: string;
}) {
  const router = useRouter();
  const { notify } = useUI();
  const [username, setUsername] = useState(initial?.username || "");
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.signature || "");
  const [remove, setRemove] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [drawOpen, setDrawOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  useUnsavedChanges(dirty, "account profile");
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function chooseFile(selected?: File) {
    if (!selected) return;
    if (
      selected.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(selected.type)
    ) {
      setError("Choose a PNG, JPG, or WebP image smaller than 5 MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRemove(false);
    setDirty(true);
    setError("");
  }
  function save() {
    setError("");
    const form = new FormData();
    form.set("username", username);
    form.set("name", name);
    form.set("phone", phone);
    form.set("role", role);
    form.set("version", String(initial?.version || 0));
    form.set("removeSignature", remove ? "yes" : "no");
    if (file) form.set("signature", file);
    start(async () => {
      const result = await saveAccountAction(form);
      if (!result.ok) setError(result.error);
      else {
        setDirty(false);
        notify("Account and signature saved");
        router.refresh();
      }
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR SALES IDENTITY</p>
          <h1>My account</h1>
          <p className="muted">
            Your contact details and signature for customer documents.
          </p>
        </div>
      </div>
      <SectionNavigation
        label="Account sections"
        sections={[
          { id: "account-details", label: "Identity" },
          { id: "account-signature", label: "Signature" },
          { id: "account-email", label: "Email" },
          { id: "account-password", label: "Password" },
        ]}
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset disabled={pending} className="account-layout">
          <section
            className="panel padded settings-section"
            id="account-details"
          >
            <div className="section-heading">
              <h2>
                <UserRound size={19} /> Account details
              </h2>
            </div>
            <div className="form-grid">
              <Field
                label="Username"
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  setDirty(true);
                }}
                required
              />
              <Field
                label="Full name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setDirty(true);
                }}
                required
              />
              <Field
                label="Role / job title"
                value={role}
                onChange={(value) => {
                  setRole(value);
                  setDirty(true);
                }}
                placeholder="Sales Executive"
                maxLength={100}
              />
              <Field
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  setDirty(true);
                }}
                placeholder="+62 812 3456 7890"
                required
              />
              <Field
                label="Sign-in email"
                value={email}
                onChange={() => {}}
                readOnly
              />
            </div>
            <p className="muted small-text">
              Use your username and password to sign in. Your name, job title,
              and phone number appear on quotations and invoices.
            </p>
          </section>
          <section
            className="panel padded signature-panel settings-section"
            id="account-signature"
          >
            <div className="section-heading">
              <h2>
                <PenLine size={19} /> Your signature
              </h2>
            </div>
            <div
              className={`signature-preview ${preview ? "has-signature" : ""}`}
            >
              {preview ? (
                <DocumentImage
                  src={preview}
                  alt="Signature preview"
                  width={320}
                  height={128}
                />
              ) : (
                <>
                  <PenLine size={32} />
                  <p>No signature yet</p>
                </>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              aria-label="Signature image"
              onChange={(event) => {
                chooseFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <div className="signature-actions">
              <button
                className="button"
                type="button"
                onClick={() => setDrawOpen(true)}
              >
                <PenLine size={16} /> Draw signature
              </button>
              <button
                className="button"
                type="button"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} />
                {preview ? "Replace signature" : "Upload signature"}
              </button>
              {preview && (
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                    setRemove(true);
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              )}
            </div>
            <p className="small-text muted">
              PNG, JPG, or WebP · up to 5 MB. A clear signature on a white or
              transparent background prints best.
            </p>
            <p className="small-text muted">
              Save your profile after drawing or uploading. Saved documents keep
              their original signature; in a quotation, choose “Use my current
              account details” to update its next saved version.
            </p>
          </section>
          <div className="account-save settings-save-bar">
            <Notice text={error} />
            <div className="settings-save-state" role="status">
              <strong>
                {pending
                  ? "Saving your profile…"
                  : dirty
                    ? "You have unsaved changes"
                    : "Your sales identity"}
              </strong>
              <span>
                {dirty
                  ? "Save to use these details in new documents."
                  : "Used on quotations and invoices."}
              </span>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="button primary"
                disabled={pending || (!dirty && !!initial)}
              >
                {pending ? "Saving…" : "Save account"}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
      {drawOpen && (
        <SignatureDrawer
          onClose={() => setDrawOpen(false)}
          onUse={chooseFile}
        />
      )}
      <section
        className="panel padded security-panel"
        id="account-email"
        aria-labelledby="email-heading"
      >
        <h2 id="email-heading">Change email</h2>
        <p className="section-description">
          Update the email you use to sign in. Enter your current password to
          confirm it is you.
        </p>
        {pendingEmail && pendingEmail.toLowerCase() !== email.toLowerCase() && (
          <div className="email-pending" role="status">
            <strong>Awaiting confirmation: {pendingEmail}</strong>
            <p>
              Check both your current and new inboxes and follow the
              confirmation links. Keep using {email} until the change is
              confirmed. Then refresh this page.
            </p>
            <button
              className="button"
              type="button"
              disabled={pending || dirty}
              onClick={() => router.refresh()}
            >
              Check confirmation status
            </button>
          </div>
        )}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setEmailError("");
            setEmailSuccess("");
            start(async () => {
              const result = await changeEmailAction(newEmail, emailPassword);
              if (!result.ok) setEmailError(result.error);
              else {
                setEmailPassword("");
                setNewEmail("");
                setEmailSuccess(
                  result.status === "pending"
                    ? `Confirmation requested for ${result.email}. Check both inboxes and follow the confirmation links.`
                    : `Your sign-in email is now ${result.email}.`,
                );
                router.refresh();
              }
            });
          }}
        >
          <fieldset disabled={pending || dirty}>
            <div className="form-grid">
              <Field
                label="New sign-in email"
                type="email"
                value={newEmail}
                onChange={setNewEmail}
                placeholder="you@example.com"
                required
              />
              <Field
                label="Current password to change email"
                type="password"
                value={emailPassword}
                onChange={setEmailPassword}
                required
              />
            </div>
            <Notice text={emailError} />
            <Notice text={emailSuccess} success />
            <div className="form-actions">
              <button
                className="button"
                disabled={
                  pending || dirty || !newEmail.trim() || !emailPassword
                }
              >
                Update sign-in email
              </button>
            </div>
          </fieldset>
        </form>
        {dirty && (
          <p className="muted small-text">
            Save your account changes before changing your email.
          </p>
        )}
      </section>
      <section
        className="panel padded security-panel settings-section"
        id="account-password"
      >
        <h2>Change password</h2>
        <p className="section-description">
          Use at least 12 characters. Changing your password signs you out.
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setPasswordError("");
            start(async () => {
              const result = await passwordAction(current, next);
              setPasswordError(result.error);
            });
          }}
        >
          <fieldset disabled={pending}>
            <div className="form-grid">
              <Field
                label="Current password"
                type="password"
                value={current}
                onChange={setCurrent}
                required
              />
              <Field
                label="New password (at least 12 characters)"
                type="password"
                value={next}
                onChange={setNext}
                required
              />
            </div>
            <Notice text={passwordError} />
            <div className="form-actions">
              <button className="button" disabled={pending || dirty}>
                Change password & sign out
              </button>
            </div>
            {dirty && (
              <p className="muted small-text">
                Save your account changes before changing your password.
              </p>
            )}
          </fieldset>
        </form>
      </section>
    </>
  );
}
