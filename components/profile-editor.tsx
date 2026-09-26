"use client";
import SectionNavigation from "./section-navigation";
import DocumentImage from "./document-image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Upload, Trash2 } from "lucide-react";
import { Area, Field, Notice } from "./fields";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { profileAction } from "@/lib/server/actions";
import type { Profile } from "@/lib/domain/model";
export default function ProfileEditor({ initial }: { initial: Profile }) {
  const [data, setData] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial.logo || "");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useUnsavedChanges(dirty, "company profile");
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setMessage("");
  };
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
      <SectionNavigation
        label="Company sections"
        sections={[
          { id: "company-details", label: "Company" },
          { id: "company-logo", label: "Logo" },
          { id: "company-taxes", label: "Taxes" },
          { id: "company-banks", label: "Bank accounts" },
        ]}
      />
      <form
        noValidate
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage("");
          const upload = new FormData();
          upload.set("removeLogo", removeLogo ? "yes" : "no");
          if (file) upload.set("logo", file);
          start(async () => {
            const r = await profileAction({ ...data, logo: undefined }, upload);
            setSuccess(r.ok);
            setMessage(r.ok ? "Profile saved successfully." : r.error);
            if (r.ok) {
              setPreview(r.logo || "");
              setFile(null);
              setRemoveLogo(false);
              setDirty(false);
              setLogoError("");
            }
          });
        }}
      >
        <fieldset disabled={pending} className="stack">
          <section
            className="panel padded settings-section"
            id="company-details"
          >
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
          <section className="panel padded settings-section" id="company-logo">
            <h2>Company logo</h2>
            <p className="section-description">
              Add your logo to the header of new quotations and their invoices.
            </p>
            <div className="company-logo-editor">
              <div
                className={`company-logo-preview ${preview ? "has-logo" : ""}`}
              >
                {preview ? (
                  <DocumentImage
                    src={preview}
                    alt="Company logo preview"
                    width={160}
                    height={100}
                  />
                ) : (
                  <>
                    <ImagePlus size={30} />
                    <span>No logo uploaded</span>
                  </>
                )}
              </div>
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Company logo image"
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!selected) return;
                    if (
                      !selected.size ||
                      selected.size > 5 * 1024 * 1024 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        selected.type,
                      )
                    ) {
                      setLogoError(
                        "Choose a PNG, JPG, or WebP image smaller than 5 MB.",
                      );
                      return;
                    }
                    setFile(selected);
                    setPreview(URL.createObjectURL(selected));
                    setRemoveLogo(false);
                    setDirty(true);
                    setLogoError("");
                    setMessage("");
                  }}
                />
                <div className="signature-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={16} />
                    {preview ? "Replace logo" : "Upload logo"}
                  </button>
                  {preview && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setFile(null);
                        setPreview("");
                        setRemoveLogo(true);
                        setDirty(true);
                        setLogoError("");
                        setMessage("");
                      }}
                    >
                      <Trash2 size={16} /> Remove logo
                    </button>
                  )}
                </div>
                <p className="muted small-text">
                  PNG, JPG, or WebP · up to 5 MB. A transparent background works
                  best on printed documents.
                </p>
                <p className="muted small-text">
                  Click Save profile to apply your changes. Saved quotations
                  keep their original logo.
                </p>
                <Notice text={logoError} />
              </div>
            </div>
          </section>
          <section className="panel padded settings-section" id="company-taxes">
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
          <div className="form-grid settings-section" id="company-banks">
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
                      onChange={(v) =>
                        update(key, { ...data[key], [field]: v })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="settings-save-bar">
            <Notice text={message} success={success} />
            <div className="settings-save-state" role="status">
              <strong>
                {pending
                  ? "Saving company settings…"
                  : dirty
                    ? "You have unsaved changes"
                    : "Company settings"}
              </strong>
              <span>Changes apply to new quotations.</span>
            </div>
            <button className="button primary" disabled={pending || !dirty}>
              {pending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
