import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { database } from "@/lib/db";
import { getInvoice } from "@/lib/server/invoices";
import { invoiceStatuses } from "@/lib/domain/invoice";
import PrintButton from "@/components/print-button";
import CustomerPaper from "@/components/customer-paper";
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const invoice = await getInvoice(database(), id);
  if (!invoice) notFound();
  const doc = {
    ...invoice.document,
    notes: invoice.details.notes,
    terms: invoice.details.terms,
    bank: invoice.details.bank,
  };
  return (
    <main className="print-page">
      <div className="print-toolbar">
        <Link className="button" href={`/invoice/${id}`}>
          ← Back
        </Link>
        <span>
          {invoice.number} · {invoiceStatuses[invoice.status]}
        </span>
        <PrintButton />
      </div>
      <CustomerPaper
        document={doc}
        number={invoice.number}
        status={invoice.status}
        invoice={{
          kind: invoice.kind,
          date: invoice.details.date,
          dueDate: invoice.details.dueDate,
          quotationNumber: invoice.quotationNumber,
          quotationRevision: invoice.quotationRevision,
        }}
      />
    </main>
  );
}
