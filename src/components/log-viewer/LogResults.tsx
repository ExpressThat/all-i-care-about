import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { LogEntry } from "@/lib/providers/opensearch/logs";

export function LogResults({
  logs,
  total,
}: {
  logs: LogEntry[];
  total: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="min-h-0 rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-semibold">Logs</h3>
        <span className="text-xs text-muted-foreground">{total} matches</span>
      </div>
      <div className="themed-scrollbar max-h-[calc(100svh-24rem)] overflow-auto">
        {logs.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            No logs found
          </div>
        ) : (
          logs.map((log) => {
            const id = `${log.index}:${log.id}`;
            const isExpanded = expanded.has(id);

            return (
              <div className="border-b last:border-b-0" key={id}>
                <button
                  className="grid w-full grid-cols-[1.5rem_minmax(11rem,15rem)_5rem_minmax(7rem,10rem)_1fr] items-center gap-3 px-4 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => toggle(id)}
                  type="button"
                >
                  {isExpanded ? (
                    <ChevronDown aria-hidden="true" className="size-4" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="size-4" />
                  )}
                  <span className="truncate font-mono text-xs">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleString()
                      : "No timestamp"}
                  </span>
                  <span className="truncate rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {log.level ?? "-"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {log.service ?? log.index}
                  </span>
                  <span className="truncate">
                    {log.message ?? "No message"}
                  </span>
                </button>
                {isExpanded ? (
                  <pre className="overflow-auto bg-muted/40 px-4 py-3 text-xs">
                    {JSON.stringify(log.source, null, 2)}
                  </pre>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
