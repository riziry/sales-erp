import { database } from "@/lib/db";
import { catalog, profile } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import { newQuotation } from "@/lib/domain/model";
import QuotationEditor from "@/components/quotation-editor";
export default async function NewQuotation() {
  await requireUser();
  const db = database();
  const [c, p] = await Promise.all([catalog(db), profile(db)]);
  return <QuotationEditor initial={newQuotation(p)} catalog={c} />;
}
