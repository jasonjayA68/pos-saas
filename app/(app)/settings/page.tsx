import { redirect } from "next/navigation";
import { getActiveMember } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";

// /settings redirects to the first tab the user can access. Owners and
// managers land on /settings/business; cashiers (no business:update) land
// on /settings/profile.
export default async function SettingsIndex() {
  const member = await getActiveMember();
  if (hasPermission(member.permissions, "business:update")) {
    redirect("/settings/business");
  }
  redirect("/settings/profile");
}
