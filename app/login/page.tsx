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
      </section>
    </main>
  );
}
