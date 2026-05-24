import { getAdminBillingSettings } from "@/features/billing/admin-queries";
import { BillingSettingsForm } from "./_components/settings-form";

export const metadata = { title: "Admin · Billing settings" };

export default async function BillingSettingsPage() {
  const settings = await getAdminBillingSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Billing settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          These details are shown to customers on the payment page. Update QR
          codes and bank info anytime — changes take effect immediately.
        </p>
      </div>
      <BillingSettingsForm initial={settings} />
    </div>
  );
}
