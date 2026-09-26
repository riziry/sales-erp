import Image from "next/image";
export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="app-brand">
      <span className="app-logo app-logo-image">
        <Image
          src="/logo.png"
          alt={compact ? "sales-erp" : ""}
          width={1254}
          height={1254}
          sizes="80px"
        />
      </span>
      {!compact && (
        <span className="app-wordmark">
          sales-erp<small>Your sales workspace</small>
        </span>
      )}
    </span>
  );
}
