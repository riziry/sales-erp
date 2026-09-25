import { notFound } from "next/navigation";
import { catalog } from "@/lib/server/repository";
import { database } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { masterSchemas, type MasterKind } from "@/lib/domain/model";
import MasterManager from "@/components/master-manager";
export default async function MasterPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  await requireUser();
  const { kind } = await params;
  if (!Object.hasOwn(masterSchemas, kind)) notFound();
  return (
    <MasterManager
      kind={kind as MasterKind}
      catalog={await catalog(database())}
    />
  );
}
