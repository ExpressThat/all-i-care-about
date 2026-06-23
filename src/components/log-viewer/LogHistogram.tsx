import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { LogHistogramBucket } from "@/lib/providers/opensearch/logs";

const chartConfig = {
  count: {
    label: "Count",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function LogHistogram({
  buckets,
  loading,
}: {
  buckets: LogHistogramBucket[];
  loading: boolean;
}) {
  const data = buckets.map((bucket) => ({
    count: bucket.count,
    timestamp: bucket.timestamp,
    time: new Date(bucket.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="h-40 rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Count</h3>
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : null}
      </div>
      <div className="h-24">
        {data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No histogram data
          </div>
        ) : (
          <ChartContainer
            className="h-full w-full"
            config={chartConfig}
            initialDimension={{ width: 640, height: 96 }}
          >
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="time"
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const timestamp = payload?.[0]?.payload?.timestamp;
                      return timestamp
                        ? new Date(timestamp).toLocaleString()
                        : "";
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
