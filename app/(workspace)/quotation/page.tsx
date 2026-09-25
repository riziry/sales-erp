import { database } from "@/lib/db";
import { listQuotations } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import { calculate } from "@/lib/domain/calculate";
import QuotationList from "@/components/quotation-list";
export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; customer?: string }>;
}) {
  await requireUser();
  const [initial, all] = await Promise.all([
    searchParams,
    listQuotations(database()),
  ]);
  return (
    <QuotationList
      initial={initial}
      rows={all.map((row) => ({
        id: row.id,
        number: row.number,
        revision: row.revision,
        status: row.status,
        event: row.data.event,
        customer: row.data.customer.name,
        date: row.data.date,
        total: calculate(row.data).total,
      }))}
    />
  );
}
