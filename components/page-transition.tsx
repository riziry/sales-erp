"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
export default function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="page-transition" key={path}>
      {children}
    </div>
  );
}
