import { database } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { listQuotations } from "@/lib/server/repository";
import { listFollowups } from "@/lib/server/sales";
import { calculate } from "@/lib/domain/calculate";
import { jakartaDate } from "@/lib/domain/model";
import SalesOverview from "@/components/sales-overview";
export default async function SalesPage() {
  await requireUser();
  const db = database();
  const [quotes, tasks] = await Promise.all([
    listQuotations(db),
    listFollowups(db),
  ]);
  return (
    <SalesOverview
      today={jakartaDate()}
      rows={quotes.map((q) => ({
        id: q.id,
        seriesId: q.seriesId,
        number: q.number,
        event: q.data.event,
        customer: q.data.customer.name,
        status: q.status,
        validUntil: q.data.validUntil,
        net: calculate(q.data).net,
      }))}
      tasks={tasks.map(({ id, seriesId, note, dueDate, done }) => ({
        id,
        seriesId,
        note,
        dueDate,
        done,
      }))}
    />
  );
}
