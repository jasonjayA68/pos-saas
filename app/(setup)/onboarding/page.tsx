import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingForm } from "./_components/onboarding-form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const session = await verifySession();
  const member = await prisma.businessMember.findFirst({
    where: { userId: session.userId, deletedAt: null },
    include: { business: { select: { name: true } } },
  });

  if (member) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {member.business.name}</CardTitle>
          <CardDescription>
            Your account is ready. You can start configuring products,
            branches, and staff from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
          A default branch named <strong>Main</strong> has been created. You
          can rename it or add more branches under Settings later.
        </CardContent>
        <CardFooter>
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return <OnboardingForm />;
}
