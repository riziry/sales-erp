import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "YW Production — Quotation",
    template: "%s · YW Production",
  },
  description: "Quotations, production packages, and costing for YW Production",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function apply(){var t='system';try{t=localStorage.getItem('yw-theme')||'system'}catch(e){}document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}apply();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);addEventListener('storage',apply)})()`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
