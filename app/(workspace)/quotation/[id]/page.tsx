import { notFound } from "next/navigation";
import { database } from "@/lib/db";
import { catalog, getQuotation, profile } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import { accountProfile, accountKey } from "@/lib/server/accounts";
import { salesIdentity } from "@/lib/domain/account";
import QuotationEditor from "@/components/quotation-editor";
export default async function QuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const db = database();
  const [q, c, account, company] = await Promise.all([
    getQuotation(db, id),
    catalog(db),
    accountProfile(db, accountKey(user)),
    profile(db),
  ]);
  if (!q) notFound();
  return (
    <QuotationEditor
      key={`${q.id}-${q.version}`}
      initial={q.data}
      currentSales={salesIdentity(account)}
      currentCompanyLogo={company.logo ?? null}
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
