import { database } from "@/lib/db";
import { getQuotation, listQuotations } from "@/lib/server/repository";
import { listInvoices } from "@/lib/server/invoices";
import { requireUser } from "@/lib/server/auth";
import { calculate } from "@/lib/domain/calculate";
import InvoiceCreate from "@/components/invoice-create";
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ quotation?: string }>;
}) {
  await requireUser();
  const db = database();
  const [quotes, invoices, search] = await Promise.all([
    listQuotations(db),
    listInvoices(db),
    searchParams,
  ]);
  // A final installment may be created from the original invoice even after
  // its quotation has a newer revision. The billing snapshot stays unchanged.
  if (search.quotation && !quotes.some((q) => q.id === search.quotation)) {
    const original = await getQuotation(db, search.quotation);
    if (
      original &&
      invoices.some(
        (invoice) =>
          invoice.seriesId === original.seriesId && invoice.status !== "VOID",
      )
    )
      quotes.push({
        id: original.id,
        version: original.version,
        seriesId: original.seriesId,
        number: original.number,
        revision: original.revision,
        status: original.status,
        data: original.data,
        updatedAt: original.updatedAt,
      });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BILLING</p>
          <h1>New invoice</h1>
          <p className="muted">
            Turn a saved quotation into a full or installment invoice.
          </p>
        </div>
      </div>
      <InvoiceCreate
        initial={search.quotation || ""}
        sources={quotes
          .filter((q) => q.status !== "REJECTED" && q.data.lines.length > 0)
          .map((q) => {
            const totals = calculate(q.data);
            return {
              id: q.id,
              version: q.version,
              seriesId: q.seriesId,
              number: q.number,
              revision: q.revision,
              event: q.data.event,
              customer: q.data.customer.name,
              net: totals.net,
              ppn: totals.ppn,
              pph: totals.pph,
              total: totals.total,
            };
          })}
        plans={invoices
          .filter((invoice) => invoice.status !== "VOID")
          .map((invoice) => ({
            id: invoice.id,
            seriesId: invoice.seriesId,
            kind: invoice.kind,
            quotationRevision: invoice.quotationRevision,
            net: invoice.document.net,
            ppn: invoice.document.ppn,
            pph: invoice.document.pph,
            total: invoice.document.total,
          }))}
      />
    </>
  );
}
