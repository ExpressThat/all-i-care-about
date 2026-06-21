import type { DateTimeProviderField } from "@/lib/providers/providerTypes";

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export function startOfDayTimestamp(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function isDateDisabled(date: Date, field: DateTimeProviderField) {
  const timestamp = startOfDayTimestamp(date);
  return (
    (field.min !== undefined &&
      timestamp < startOfDayTimestamp(new Date(field.min))) ||
    (field.max !== undefined &&
      timestamp > startOfDayTimestamp(new Date(field.max)))
  );
}
