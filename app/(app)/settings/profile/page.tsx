import { getProfileSettings } from "@/features/settings/queries";
import { ProfileForm } from "./_components/profile-form";

export const metadata = { title: "Settings · Profile" };

export default async function ProfileSettingsPage() {
  const data = await getProfileSettings();
  return <ProfileForm initial={data} />;
}
