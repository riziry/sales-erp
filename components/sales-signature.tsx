import DocumentImage from "./document-image";
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
          <DocumentImage
            src={companyLogo}
            alt=""
            aria-hidden="true"
            className="signature-company-stamp"
            width={140}
            height={62}
            loading="eager"
          />
        )}
        {sales?.signature && (
          <DocumentImage
            src={sales.signature}
            alt={`Signature of ${sales.name}`}
            className="sales-signature-image"
            width={180}
            height={64}
            loading="eager"
          />
        )}
      </div>
      <strong>{sales?.name || "Sales representative"}</strong>
      {sales?.role && <p className="sales-role">{sales.role}</p>}
      <p>
        {sales?.phone
          ? `Contact: ${sales.phone}`
          : "Contact: ____________________"}
      </p>
    </div>
  );
}
