"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
const routes: Record<string, string> = {
  sales: "Sales overview",
  quotation: "Quotations",
  invoice: "Invoices",
  items: "Items & services",
  packages: "Packages",
  customers: "Customers",
  vendors: "Vendors",
  prices: "Vendor pricing",
  account: "My account",
  profile: "Company & accounts",
  help: "Getting started",
};
export default function WorkspaceContext() {
  const parts = usePathname().split("/").filter(Boolean);
  const directory = parts[0] === "master";
  const section = directory ? parts[1] : parts[0];
  const title = routes[section] || "Workspace";
  const detail = !directory && parts[1];
  return (
    <nav className="workspace-context" aria-label="Breadcrumb">
      <span>{directory ? "Directory" : "Workspace"}</span>
      <ChevronRight size={13} aria-hidden="true" />
      {detail ? (
        <>
          <Link href={`/${section}`}>{title}</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <strong aria-current="page">
            {detail === "new" ? "Create new" : "Document"}
          </strong>
        </>
      ) : (
        <strong aria-current="page">{title}</strong>
      )}
    </nav>
  );
}
