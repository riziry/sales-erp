import ThemeSwitcher from "@/components/theme-switcher";
import LoginForm from "./form";
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand-mark">
          yw<span>•</span>
        </div>
        <p className="eyebrow">YW PRODUCTION</p>
        <h1>
          Quotations, organized.
          <br />
          Every detail matters.
        </h1>
        <p>
          Your workspace for quotations, production packages, and cost planning.
        </p>
        <div className="login-decoration">
          <span>01 / QUOTATION</span>
          <span>02 / COSTING</span>
          <span>03 / PRODUCTION PACKAGES</span>
        </div>
      </section>
      <section className="login-card">
        <div className="login-theme">
          <ThemeSwitcher />
        </div>
        <p className="eyebrow">COMMERCIAL WORKSPACE</p>
        <h2>Welcome back</h2>
        <p className="muted">Sign in with your YW Production account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
