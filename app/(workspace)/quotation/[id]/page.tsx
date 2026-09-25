import { notFound } from "next/navigation";
import { database } from "@/lib/db";
import { catalog, getQuotation } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import QuotationEditor from "@/components/quotation-editor";
export default async function QuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const db = database();
  const [q, c] = await Promise.all([getQuotation(db, id), catalog(db)]);
  if (!q) notFound();
  return (
    <QuotationEditor
      key={`${q.id}-${q.version}`}
      initial={q.data}
      catalog={c}
      saved={{
        id: q.id,
        version: q.version,
        status: q.status,
        number: q.number,
        revision: q.revision,
        latestRevision: q.latestRevision,
        history: q.history,
      }}
    />
  );
}
