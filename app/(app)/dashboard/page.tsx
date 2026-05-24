import { Activity } from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/money";

export const metadata = { title: "Dashboard" };

const stats = [
  { label: "Today's sales", value: formatPHP(0), delta: "—" },
  { label: "Orders today", value: "0", delta: "—" },
  { label: "Active products", value: "0", delta: "—" },
  { label: "Low stock items", value: "0", delta: "—" },
];

export default async function DashboardPage() {
  const member = await getActiveMember();
  const displayName =
    member.fullName?.trim() || member.email.split("@")[0];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={`${member.businessName} · today's snapshot.`}
        actions={
          <Badge variant="outline" className="capitalize">
            {member.roleName}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-500 dark:text-neutral-400">
              vs. yesterday {s.delta}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
          <CardDescription>
            Sales, voids, and inventory adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Once you ring your first sale, it will show up here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
