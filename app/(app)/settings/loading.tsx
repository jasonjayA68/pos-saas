import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
