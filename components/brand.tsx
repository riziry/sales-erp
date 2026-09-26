import { ArrowUpRight } from "lucide-react";
export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="app-brand">
      <span className="app-logo">
        <ArrowUpRight size={24} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="app-wordmark">
          sales-erp<small>Your sales workspace</small>
        </span>
      )}
    </span>
  );
}
