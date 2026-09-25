"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronDown,
  FileText,
  Receipt,
  Package,
  Layers,
  Users,
  Handshake,
  Tags,
  Settings,
  BookOpen,
} from "lucide-react";
const groups = [
  {
    label: "WORKSPACE",
    links: [
      { href: "/quotation", label: "Quotations", Icon: FileText },
      { href: "/invoice", label: "Invoices", Icon: Receipt },
    ],
  },
  {
    label: "YOUR DIRECTORY",
    links: [
      { href: "/master/items", label: "Items & services", Icon: Package },
      { href: "/master/packages", label: "Packages", Icon: Layers },
      { href: "/master/customers", label: "Customers", Icon: Users },
      { href: "/master/vendors", label: "Vendors", Icon: Handshake },
      { href: "/master/prices", label: "Vendor pricing", Icon: Tags },
    ],
  },
  {
    label: "PREFERENCES",
    links: [
      { href: "/profile", label: "Company & accounts", Icon: Settings },
      { href: "/help", label: "Getting started", Icon: BookOpen },
    ],
  },
];
export default function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const nav = (
    <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`nav-link ${path.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
  if (!mobile) return nav;
  const current = groups
    .flatMap((group) => group.links)
    .find((link) => path.startsWith(link.href));
  return (
    <details className="mobile-navigation">
      <summary>
        <Menu size={18} />
        <span>Menu</span>
        <span className="mobile-current">{current?.label || "Workspace"}</span>
        <ChevronDown size={16} />
      </summary>
      {nav}
    </details>
  );
}
