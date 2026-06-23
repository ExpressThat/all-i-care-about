import { ScrollText } from "lucide-react";

export function LogsPage() {
  return (
    <div className="flex h-svh min-w-0 flex-col">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Logs</h2>
        <p className="text-sm text-muted-foreground">
          View configured logging provider output.
        </p>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex min-h-80 w-full max-w-xl flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <ScrollText
            aria-hidden="true"
            className="mb-3 size-8 text-muted-foreground"
          />
          <h3 className="text-sm font-semibold">Logs screen</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Log polling and display will be wired up when the OpenSearch
            provider starts reading entries.
          </p>
        </div>
      </section>
    </div>
  );
}
