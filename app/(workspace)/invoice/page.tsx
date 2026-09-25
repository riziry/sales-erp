import { requireUser } from "@/lib/server/auth";
import { database } from "@/lib/db";
import { listInvoices } from "@/lib/server/invoices";
import { invoiceAmounts } from "@/lib/domain/invoice";
import InvoiceList from "@/components/invoice-list";
export default async function InvoicesPage() {
  await requireUser();
  const all = await listInvoices(database());
  return (
    <InvoiceList
      rows={all.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        quotationNumber: invoice.quotationNumber,
        customer: invoice.document.customer.name,
        event: invoice.document.event,
        dueDate: invoice.details.dueDate,
        kind: invoice.kind,
        status: invoice.status,
        total: invoiceAmounts(invoice.document, invoice.kind).total,
      }))}
    />
  );
}
