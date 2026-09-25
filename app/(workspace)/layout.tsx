import Link from "next/link";
import ThemeSwitcher from "@/components/theme-switcher";
import { TutorialButton } from "@/components/tutorial";
import { LogOut, ArrowUpRight } from "lucide-react";
import Navigation from "@/components/navigation";
import { requireUser } from "@/lib/server/auth";
import { logoutAction } from "@/lib/server/actions";
export default async function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="workspace">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/quotation" className="brand">
          <span className="brand-mark">
            yw<span>•</span>
          </span>
          <span>
            PRODUCTION<small>Commercial workspace</small>
          </span>
        </Link>

        <div className="desktop-navigation">
          <Navigation />
        </div>
        <Navigation mobile />
        <div className="sidebar-bottom">
          <div className="account-avatar">YW</div>
          <div>
            <strong>Internal account</strong>
            <small>YW Production</small>
          </div>
          <form action={logoutAction}>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span>
            YW Production <span className="muted">/ Commercial</span>
          </span>
          <div className="topbar-actions">
            <ThemeSwitcher />
            <TutorialButton />
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>YW Production · Quotation & costing</span>
          <Link href="/help">
            Need a hand? Open the guide <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
