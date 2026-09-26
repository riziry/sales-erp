import Brand from "@/components/brand";
import QuickActions from "@/components/quick-actions";
import PageTransition from "@/components/page-transition";
import Hint from "@/components/ui/tooltip";
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
          <Brand />
        </Link>

        <div className="desktop-navigation">
          <Navigation />
        </div>
        <Navigation mobile />
        <div className="sidebar-bottom">
          <div className="account-avatar">SE</div>
          <div>
            <strong>Internal account</strong>
            <small>sales-erp</small>
          </div>
          <form action={logoutAction}>
            <Hint text="Sign out">
              <button className="icon-button" aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </Hint>
          </form>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <QuickActions />
          <div className="topbar-actions">
            <ThemeSwitcher />
            <TutorialButton />
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="app-footer">
          <span>sales-erp · Quotation & costing</span>
          <Link href="/help">
            Need a hand? Open the guide <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
