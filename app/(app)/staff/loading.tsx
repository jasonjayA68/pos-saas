import { Skeleton } from "@/components/ui/skeleton";

export default function StaffLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
