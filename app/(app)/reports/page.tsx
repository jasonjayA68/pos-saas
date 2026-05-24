import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Reports" };

const reportCards = [
  {
    title: "Sales summary",
    description: "Daily, weekly, and monthly revenue trends.",
  },
  {
    title: "Top products",
    description: "What's selling and what's not.",
  },
  {
    title: "Cashier performance",
    description: "Sales count and total by staff member.",
  },
];

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Reports"
        description="Insights across your business and branches."
        actions={<Button variant="outline">Export CSV</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((r) => (
          <Card key={r.title}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-neutral-500 dark:text-neutral-400">
              Available once you have sales data.
            </CardContent>
          </Card>
        ))}
      </div>
      <EmptyState
        icon={BarChart3}
        title="No data to chart yet"
        description="Reports will populate as soon as transactions start flowing."
      />
    </div>
  );
}
