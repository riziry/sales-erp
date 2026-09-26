import { databaseDiagnostic } from "@/lib/db/diagnostics";
import { database } from "@/lib/db";
import { accountProfile, accountKey } from "@/lib/server/accounts";
import Brand from "@/components/brand";
import WorkspaceContext from "@/components/workspace-context";
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
  const user = await requireUser();
  const account = await (async () => {
    try {
      return await accountProfile(database(), accountKey(user));
    } catch (error) {
      // Stable diagnostic for deployment logs without SQL, personal data, or secrets.
      const code = databaseDiagnostic(error);
      console.error(`[sales-erp] Workspace database: ${code}`);
      throw new Error(`Workspace unavailable (${code}).`);
    }
  })();
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
          <div className="account-avatar">
            {account?.name.slice(0, 2).toUpperCase() || "SE"}
          </div>
          <div>
            <Link href="/account">
              <strong>{account?.name || "Set up my account"}</strong>
            </Link>
            <small>
              {account?.username ? `@${account.username}` : "sales-erp"}
            </small>
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
          <WorkspaceContext />
          <div className="topbar-actions">
            <QuickActions />
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
