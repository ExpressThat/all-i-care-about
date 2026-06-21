export function IssueSkeletons() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="h-96 w-80 shrink-0 animate-pulse rounded-lg border bg-muted/30"
          key={index}
        />
      ))}
    </div>
  );
}
