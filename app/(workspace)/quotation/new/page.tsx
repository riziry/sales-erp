import { database } from "@/lib/db";
import { catalog, profile } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import { newQuotation } from "@/lib/domain/model";
import { accountProfile, accountKey } from "@/lib/server/accounts";
import { salesIdentity } from "@/lib/domain/account";
import QuotationEditor from "@/components/quotation-editor";
export default async function NewQuotation() {
  const user = await requireUser();
  const db = database();
  const [c, p, account] = await Promise.all([
    catalog(db),
    profile(db),
    accountProfile(db, accountKey(user)),
  ]);
  const sales = salesIdentity(account);
  return (
    <QuotationEditor
      initial={{ ...newQuotation(p), sales }}
      catalog={c}
      currentSales={sales}
      currentCompanyLogo={p.logo ?? null}
    />
  );
}
