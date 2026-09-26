import type { Metadata } from "next";
import UIProvider from "@/components/ui-provider";
import "./globals.css";
import "./responsive.css";
import "./login.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: {
    default: "sales-erp — Sales workspace",
    template: "%s · sales-erp",
  },
  description: "Quotations, invoices, customer follow-ups, and sales planning",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function apply(){var t='system';try{t=localStorage.getItem('yw-theme')||'system'}catch(e){}document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}apply();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);addEventListener('storage',apply)})()`,
          }}
        />
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
