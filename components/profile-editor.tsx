"use client";
import { useState, useTransition } from "react";
import { Area, Field, Notice } from "./fields";
import { profileAction, passwordAction } from "@/lib/server/actions";
import type { Profile } from "@/lib/domain/model";
export default function ProfileEditor({ initial }: { initial: Profile }) {
  const [data, setData] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setData((d) => ({ ...d, [key]: value }));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SETTINGS</p>
          <h1>Profile & bank accounts</h1>
          <p className="muted">
            Company details and defaults for new quotations. Existing documents
            keep their saved values.
          </p>
        </div>
      </div>
      <form
        noValidate
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await profileAction(data);
            setSuccess(r.ok);
            setMessage(r.ok ? "Profile saved successfully." : r.error);
          });
        }}
      >
        <section className="panel padded">
          <h2>Company details</h2>
          <div className="form-grid">
            <Field
              label="Company name"
              value={data.name}
              onChange={(v) => update("name", v)}
              required
            />
            <Field
              label="Contact"
              value={data.contact}
              onChange={(v) => update("contact", v)}
            />
            <Field
              label="Company email"
              value={data.email}
              onChange={(v) => update("email", v)}
            />
            <Area
              label="Company address"
              value={data.address}
              onChange={(v) => update("address", v)}
            />
          </div>
        </section>
        <section className="panel padded">
          <h2>Default taxes</h2>
          <p className="muted">
            VAT (PPN) and income tax (PPh) are optional and added to the
            subtotal after discounts.
          </p>
          <div className="form-grid">
            <Field
              label="VAT rate (PPN, %)"
              type="number"
              value={data.ppnRate}
              onChange={(v) => update("ppnRate", v)}
            />
            <Field
              label="Income tax rate (PPh, %)"
              type="number"
              value={data.pphRate}
              onChange={(v) => update("pphRate", v)}
            />
          </div>
        </section>
        <div className="form-grid">
          {(["regularBank", "taxBank"] as const).map((key) => (
            <section className="panel padded" key={key}>
              <h2>
                {key === "taxBank"
                  ? "Tax bank account"
                  : "Non-tax bank account"}
              </h2>
              <p className="muted">
                {key === "taxBank"
                  ? "Used when VAT is enabled."
                  : "Used when VAT is disabled."}
              </p>
              <div className="stack">
                {(["bank", "number", "holder"] as const).map((field) => (
                  <Field
                    key={field}
                    label={
                      {
                        bank: "Bank name",
                        number: "Account number",
                        holder: "Account holder",
                      }[field]
                    }
                    value={data[key][field]}
                    onChange={(v) => update(key, { ...data[key], [field]: v })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <Notice text={message} success={success} />
        <div className="form-actions">
          <button className="button primary" disabled={pending}>
            Save profile
          </button>
        </div>
      </form>
      <section className="panel padded security-panel">
        <h2>Change password</h2>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await passwordAction(current, next);
              setSuccess(false);
              setMessage(r.error);
            });
          }}
        >
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
          <div className="form-actions">
            <button className="button" disabled={pending}>
              Change password & sign out
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
