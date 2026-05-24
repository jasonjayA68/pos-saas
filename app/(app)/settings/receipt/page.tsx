import { getReceiptSettings } from "@/features/settings/queries";
import { ReceiptForm } from "./_components/receipt-form";

export const metadata = { title: "Settings · Receipt" };

export default async function ReceiptSettingsPage() {
  const data = await getReceiptSettings();
  return <ReceiptForm initial={data} />;
}
