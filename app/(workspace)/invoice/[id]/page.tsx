import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { database } from "@/lib/db";
import { getInvoice, quotationInvoices } from "@/lib/server/invoices";
import InvoiceEditor from "@/components/invoice-editor";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const db = database();
  const invoice = await getInvoice(db, id);
  if (!invoice) notFound();
  const siblings = await quotationInvoices(db, invoice.seriesId);
  return (
    <InvoiceEditor
      key={`${invoice.id}-${invoice.version}`}
      invoice={invoice}
      siblings={siblings
        .filter((other) => other.id !== id)
        .map(({ id, number, kind, status }) => ({ id, number, kind, status }))}
    />
  );
}
