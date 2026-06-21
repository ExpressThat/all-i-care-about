import {
  isProviderCapability,
  normalizeProviderCapability,
} from "./capabilities";
import {
  isProviderType,
  isProviderSettingRecord,
  type ProviderInstance,
} from "./providerTypes";

export function isProviderInstance(value: unknown): value is ProviderInstance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ProviderInstance>;
  return (
    typeof candidate.id === "string" &&
    isProviderType(candidate.type) &&
    typeof candidate.displayName === "string" &&
    isProviderSettingRecord(candidate.settings) &&
    Array.isArray(candidate.enabledCapabilities) &&
    candidate.enabledCapabilities.every(
      (capability) =>
        isProviderCapability(capability) ||
        normalizeProviderCapability(capability) !== null,
    ) &&
    (candidate.security === undefined ||
      (Array.isArray(candidate.security.allowedOrigins) &&
        candidate.security.allowedOrigins.every(
          (origin) => typeof origin === "string",
        ) &&
        typeof candidate.security.sealed === "string" &&
        candidate.security.version === 1))
  );
}
