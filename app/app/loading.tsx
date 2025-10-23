import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearnerDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-6 w-20" />
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                {[0, 1].map((item) => (
                  <div key={item} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
