import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { LogEntry } from "@/lib/providers/opensearch/logs";

export function LogResults({
  logs,
  total,
}: {
  logs: LogEntry[];
  total: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: logs.length,
    estimateSize: (index) => {
      const log = logs[index];
      if (!log) {
        return 52;
      }
      return expanded.has(logId(log)) ? 280 : 52;
    },
    getScrollElement: () => parentRef.current,
    overscan: 8,
  });

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
    <div className="min-h-0 overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-semibold">Logs</h3>
        <span className="text-xs text-muted-foreground">{total} matches</span>
      </div>
      <div
        className="themed-scrollbar h-[32rem] max-h-[70svh] min-h-72 overflow-auto"
        ref={parentRef}
      >
        {logs.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            No logs found
          </div>
        ) : (
          <div
            className="relative min-w-0"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const log = logs[virtualRow.index];
              if (!log) {
                return null;
              }
              const id = logId(log);
              const isExpanded = expanded.has(id);

              return (
                <div
                  className="absolute left-0 top-0 w-full border-b"
                  data-index={virtualRow.index}
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <button
                    className="grid w-full grid-cols-[1.5rem_minmax(8rem,13rem)_minmax(4rem,6rem)_minmax(6rem,10rem)_minmax(0,1fr)] items-center gap-3 px-4 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => toggle(id)}
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    )}
                    <span className="min-w-0 truncate font-mono text-xs">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : "No timestamp"}
                    </span>
                    <span className="min-w-0 truncate rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {log.level ?? "-"}
                    </span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {log.service ?? log.index}
                    </span>
                    <span className="min-w-0 truncate">
                      {log.message ?? "No message"}
                    </span>
                  </button>
                  {isExpanded ? (
                    <pre className="themed-scrollbar max-h-80 overflow-auto bg-muted/40 px-4 py-3 text-xs">
                      {JSON.stringify(log.source, null, 2)}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function logId(log: LogEntry) {
  return `${log.index}:${log.id}`;
}
