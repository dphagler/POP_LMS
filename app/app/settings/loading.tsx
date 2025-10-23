import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <section className="space-y-6">
      <header className="space-y-2 p-6 pb-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </header>
      <div className="space-y-4 p-6 pt-0">
        <div className="flex flex-wrap gap-2">
          {["profile", "appearance", "account"].map((tab) => (
            <Skeleton key={tab} className="h-10 w-28 rounded-md" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-6 rounded-box border border-base-300 bg-base-100 p-6 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-60" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-10 w-36" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-lg">
            <div className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="space-y-3 rounded-box border border-dashed border-base-300 bg-base-200/60 p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
