import { Skeleton } from "@/components/ui/skeleton"

export function RepositorySkeletons() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="w-80 rounded-lg border p-4" key={index}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
          <Skeleton className="mt-6 h-20 w-full" />
          <Skeleton className="mt-3 h-20 w-full" />
        </div>
      ))}
    </div>
  )
}
