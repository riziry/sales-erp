"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Command,
  Search,
  ArrowUpRight,
  FilePlus2,
  Receipt,
  Users,
  Package,
  Layers,
  Handshake,
  Tags,
  FileText,
  BookOpen,
  ChartNoAxesCombined,
  Settings,
  UserRound,
} from "lucide-react";
import Modal from "./modal";
const actions = [
  {
    label: "Quotations",
    detail: "Search offers and revisions",
    href: "/quotation",
    Icon: FileText,
  },
  {
    label: "Invoices",
    detail: "Browse drafts and issued invoices",
    href: "/invoice",
    Icon: Receipt,
  },
  {
    label: "Packages",
    detail: "Reusable production bundles",
    href: "/master/packages",
    Icon: Layers,
  },
  {
    label: "Vendors",
    detail: "Supplier contacts",
    href: "/master/vendors",
    Icon: Handshake,
  },
  {
    label: "Vendor pricing",
    detail: "Compare reference costs",
    href: "/master/prices",
    Icon: Tags,
  },
  {
    label: "Getting started",
    detail: "Step-by-step workspace guide",
    href: "/help",
    Icon: BookOpen,
  },
  {
    label: "My account",
    detail: "Contact details, password, and signature",
    href: "/account",
    Icon: UserRound,
  },
  {
    label: "New quotation",
    detail: "Create a customer offer",
    href: "/quotation/new",
    Icon: FilePlus2,
  },
  {
    label: "New invoice",
    detail: "Full payment or installments",
    href: "/invoice/new",
    Icon: Receipt,
  },
  {
    label: "Sales overview",
    detail: "Pipeline and follow-ups",
    href: "/sales",
    Icon: ChartNoAxesCombined,
  },
  {
    label: "Customers",
    detail: "Your customer directory",
    href: "/master/customers",
    Icon: Users,
  },
  {
    label: "Items & services",
    detail: "Prices and reusable services",
    href: "/master/items",
    Icon: Package,
  },
  {
    label: "Company settings",
    detail: "Profile, taxes, and bank accounts",
    href: "/profile",
    Icon: Settings,
  },
];
export default function QuickActions() {
  const pathname = usePathname();
  return <ActionMenu key={pathname} />;
}
function ActionMenu() {
  const results = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((open) => !open);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const filtered = actions.filter((action) =>
    `${action.label} ${action.detail}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        className="quick-actions-trigger"
        aria-label="Quick actions"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <Search size={16} />
        <span>Quick actions</span>
        <kbd>
          <Command size={11} />K
        </kbd>
      </button>
      {open && (
        <Modal
          title="Quick actions"
          onClose={() => setOpen(false)}
          className="command-modal"
        >
          <div className="search">
            <Search size={18} />
            <input
              ref={search}
              data-initial-focus
              aria-label="Find an action"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  results.current
                    ?.querySelector<HTMLAnchorElement>("a")
                    ?.focus();
                }
                if (event.key === "Enter" && filtered.length === 1) {
                  event.preventDefault();
                  results.current
                    ?.querySelector<HTMLAnchorElement>("a")
                    ?.click();
                }
              }}
              placeholder="Find a page or start something new…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div
            className="command-results"
            ref={results}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              const links = Array.from(
                results.current?.querySelectorAll<HTMLAnchorElement>("a") || [],
              );
              const index = links.indexOf(
                document.activeElement as HTMLAnchorElement,
              );
              const next = index + (event.key === "ArrowDown" ? 1 : -1);
              if (next < 0) search.current?.focus();
              else links[Math.min(next, links.length - 1)]?.focus();
            }}
          >
            {filtered.map(({ href, label, detail, Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <span className="command-icon">
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {!filtered.length && (
              <p className="muted">
                No matching actions. Try “invoice” or “customer”.
              </p>
            )}
          </div>
          <p className="small-text muted">
            Tab to browse · Enter to open · Esc to close
          </p>
        </Modal>
      )}
    </>
  );
}
