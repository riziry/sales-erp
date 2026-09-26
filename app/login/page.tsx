import {
  ArrowUpRight,
  Check,
  FileText,
  Layers,
  Send,
  ShieldCheck,
} from "lucide-react";
import Brand from "@/components/brand";
import ThemeSwitcher from "@/components/theme-switcher";
import LoginForm from "./form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ emailChange?: string }>;
}) {
  const { emailChange } = await searchParams;
  return (
    <main className="login-page login-redesign">
      <section className="login-intro">
        <Brand />
        <div className="login-story">
          <p className="eyebrow">
            <span /> LESS ADMIN. MORE MOMENTUM.
          </p>
          <h1>
            Good business
            <br />
            starts with a<br />
            <em>clear offer.</em>
          </h1>
          <p>
            Bring your customers, quotations, and invoices together. Make the
            next step feel simple.
          </p>
        </div>
        <div className="login-showcase" aria-hidden="true">
          <div className="login-orbit" />
          <div className="login-preview">
            <div className="login-preview-heading">
              <span>
                <FileText size={17} /> QUOTATION
              </span>
              <span className="login-preview-label">PREVIEW</span>
            </div>
            <strong>Your next great event</strong>
            <p>A clear offer. Every detail covered.</p>
            <div className="login-preview-line">
              <span>Production package</span>
              <span>01</span>
            </div>
            <div className="login-preview-line">
              <span>Setup &amp; crew</span>
              <span>02</span>
            </div>
            <div className="login-preview-footer">
              <span>
                <Check size={15} /> Ready for your client
              </span>
              <ArrowUpRight size={19} />
            </div>
          </div>
          <div className="login-floating-note">
            <span>
              <Check size={18} />
            </span>
            <div>
              <strong>One connected workflow</strong>
              <small>From first offer to final invoice</small>
            </div>
          </div>
        </div>
        <div className="login-workflow">
          <span>
            <Layers size={15} /> Create
          </span>
          <i />
          <span>
            <Send size={15} /> Share
          </span>
          <i />
          <span>
            <Check size={15} /> Close
          </span>
        </div>
      </section>
      <section className="login-card">
        <div className="login-theme">
          <ThemeSwitcher />
        </div>
        <div className="login-form-heading">
          <span className="login-form-symbol">
            <ArrowUpRight size={25} />
          </span>
          <p className="eyebrow">LET’S PICK UP WHERE YOU LEFT OFF</p>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in to keep your sales moving.</p>
        </div>
        {emailChange === "changed" && (
          <p className="notice success" role="status">
            Email updated. Sign in with your new email and existing password.
          </p>
        )}
        {emailChange === "review" && (
          <p className="notice" role="status">
            Check the confirmation emails in both inboxes and complete all
            required steps. If you opened the link on another device, sign in
            here after confirming. For an expired link, sign in with your
            current email and request the change again in My account.
          </p>
        )}
        <LoginForm />
        <div className="login-access-note">
          <ShieldCheck size={18} />
          <p>
            Private workspace
            <br />
            <span>Need access? Contact your workspace administrator.</span>
          </p>
        </div>
      </section>
    </main>
  );
}
