export type RelativeTimeUnit = "minutes" | "hours" | "days";

export type LogTimeRange =
  | {
      mode: "relative";
      amount: number;
      unit: RelativeTimeUnit;
    }
  | {
      mode: "absolute";
      start: string;
      end: string;
    };

const unitMillis: Record<RelativeTimeUnit, number> = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export function defaultLogTimeRange(): LogTimeRange {
  return {
    mode: "relative",
    amount: 15,
    unit: "hours",
  };
}

export function resolveTimeRange(range: LogTimeRange) {
  if (range.mode === "absolute") {
    return {
      start: new Date(range.start).toISOString(),
      end: new Date(range.end).toISOString(),
      label: `${formatDateTime(range.start)} -> ${formatDateTime(range.end)}`,
      histogramInterval: histogramInterval(
        new Date(range.start),
        new Date(range.end),
      ),
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - range.amount * unitMillis[range.unit]);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `~ ${range.amount} ${range.unit} ago -> now`,
    histogramInterval: histogramInterval(start, end),
  };
}

export function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function histogramInterval(start: Date, end: Date) {
  const duration = Math.max(0, end.getTime() - start.getTime());
  if (duration <= 60 * 60 * 1000) {
    return "1m";
  }
  if (duration <= 24 * 60 * 60 * 1000) {
    return "15m";
  }
  if (duration <= 7 * 24 * 60 * 60 * 1000) {
    return "1h";
  }
  return "1d";
}

function formatDateTime(value: string) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString();
}
