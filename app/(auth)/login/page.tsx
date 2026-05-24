import { ShieldCheck } from "lucide-react";
import { getPortal, isPortalRoutingEnabled } from "@/lib/portal";
import { LoginForm } from "./_components/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const portal = await getPortal();
  const showAdminBadge = isPortalRoutingEnabled() && portal === "admin";

  return (
    <>
      {showAdminBadge ? (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <ShieldCheck className="h-4 w-4" />
          <span>
            <strong>Super Admin portal.</strong> Only platform admins can
            sign in here.
          </span>
        </div>
      ) : null}
      <LoginForm nextUrl={next} />
    </>
  );
}
