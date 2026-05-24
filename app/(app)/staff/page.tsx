import { getTeamData } from "@/features/team/queries";
import { PageHeader } from "@/components/layout/page-header";
import { TeamClient } from "./_components/team-client";

export const metadata = { title: "Team" };

export default async function StaffPage() {
  const data = await getTeamData();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Team"
        description="Invite teammates and assign roles."
      />
      <TeamClient initial={data} />
    </div>
  );
}
