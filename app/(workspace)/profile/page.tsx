import { database } from "@/lib/db";
import { profile } from "@/lib/server/repository";
import { requireUser } from "@/lib/server/auth";
import ProfileEditor from "@/components/profile-editor";
export default async function ProfilePage() {
  await requireUser();
  return <ProfileEditor initial={await profile(database())} />;
}
