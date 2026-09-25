import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { database } from "@/lib/db";
import { getQuotation } from "@/lib/server/repository";
import { customerDocument } from "@/lib/domain/calculate";
import { statusNames } from "@/lib/domain/model";
import CustomerPaper from "@/components/customer-paper";
import PrintButton from "@/components/print-button";
export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const q = await getQuotation(database(), id);
  if (!q) notFound();
  const doc = customerDocument(q.data);
  return (
    <main className="print-page">
      <div className="print-toolbar">
        <Link href={`/quotation/${q.id}`} className="button">
          ← Back
        </Link>
        <span>
          {q.number} · R{q.revision} · {statusNames[q.status]}
        </span>
        <PrintButton />
      </div>
      <CustomerPaper
        document={doc}
        number={q.number}
        revision={q.revision}
        status={q.status}
      />
    </main>
  );
}
