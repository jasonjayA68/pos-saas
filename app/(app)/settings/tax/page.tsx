import { getTaxSettings } from "@/features/settings/queries";
import { TaxForm } from "./_components/tax-form";

export const metadata = { title: "Settings · Tax" };

export default async function TaxSettingsPage() {
  const data = await getTaxSettings();
  return <TaxForm initial={data} />;
}
