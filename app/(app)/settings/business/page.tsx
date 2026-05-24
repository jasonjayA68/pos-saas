import { getBusinessSettings } from "@/features/settings/queries";
import { BusinessForm } from "./_components/business-form";

export const metadata = { title: "Settings · Business" };

export default async function BusinessSettingsPage() {
  const data = await getBusinessSettings();
  return <BusinessForm initial={data} />;
}
