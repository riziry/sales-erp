import Brand from "@/components/brand";
import ThemeSwitcher from "@/components/theme-switcher";
import LoginForm from "./form";
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-intro">
        <Brand />
        <p className="eyebrow">YOUR SALES WORKSPACE</p>
        <h1>
          Quotations, organized.
          <br />
          Every detail matters.
        </h1>
        <p>
          From the first conversation to the final invoice. Keep your offers,
          follow-ups, and numbers in one place.
        </p>
        <div className="login-decoration">
          <span>01 / QUOTATION</span>
          <span>02 / COSTING</span>
          <span>03 / CUSTOMER FOLLOW-UPS</span>
        </div>
      </section>
      <section className="login-card">
        <div className="login-theme">
          <ThemeSwitcher />
        </div>
        <p className="eyebrow">COMMERCIAL WORKSPACE</p>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to your sales-erp workspace.</p>
        <LoginForm />
      </section>
    </main>
  );
}
