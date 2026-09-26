import Image from "next/image";
import type { SalesIdentity } from "@/lib/domain/account";

export default function SalesSignature({
  sales,
  companyLogo,
}: {
  sales: SalesIdentity | null | undefined;
  companyLogo?: string | null;
}) {
  return (
    <div className="sales-signature">
      <h3>Prepared by</h3>
      <div className="signature-space sales-signature-space">
        {sales?.signature && companyLogo && (
          <Image
            src={companyLogo}
            alt=""
            aria-hidden="true"
            className="signature-company-stamp"
            width={140}
            height={62}
            loading="eager"
            unoptimized
          />
        )}
        {sales?.signature && (
          <Image
            src={sales.signature}
            alt={`Signature of ${sales.name}`}
            className="sales-signature-image"
            width={180}
            height={64}
            loading="eager"
            unoptimized
          />
        )}
      </div>
      <strong>{sales?.name || "Sales representative"}</strong>
      <p>
        {sales?.phone
          ? `Contact: ${sales.phone}`
          : "Contact: ____________________"}
      </p>
    </div>
  );
}
