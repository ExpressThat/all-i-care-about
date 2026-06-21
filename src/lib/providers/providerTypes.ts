import type { LucideIcon } from "lucide-react";
import type { ProviderCapability, ProviderKind } from "./capabilities";

/** Unique identifier for a provider plugin family supported by the app. */
export type ProviderType = "github" | "jira";

/**
 * JSON-safe value that can be persisted in provider settings.
 *
 * UI helpers should use {@link NonSecretProviderSettings} when they need the
 * non-secret, rich runtime shape for provider settings.
 */
export type ProviderSettingValue =
  | string
  | number
  | boolean
  | { [key: string]: ProviderSettingValue };

/**
 * Persisted provider configuration instance created by the user.
 *
 * A provider instance represents one configured account/connection, such as a
 * GitHub PAT-backed connection or a future Jira site connection.
 */
export type ProviderInstance<Type extends ProviderType = ProviderType> = {
  /** Stable instance id used to look up this configured provider. */
  id: string;
  /** Provider plugin type that owns this instance. */
  type: Type;
  /** User-facing name shown in settings and provider pickers. */
  displayName: string;
  /**
   * JSON-safe provider settings as stored by Rust.
   *
   * Secret fields may appear here only as encrypted values returned by Rust.
   * Runtime helpers should use {@link NonSecretProviderSettings} instead,
   * which omits secrets and converts rich values.
   */
  settings: ProviderSettingsRecord;
  /** Capability short names enabled for this instance. */
  enabledCapabilities: ProviderCapability[];
  /**
   * Rust-sealed request security snapshot.
   *
   * This is written by Rust when saving a provider. Frontend code may display
   * the visible origins but must not treat them as trusted unless Rust verifies
   * the `sealed` payload before provider-owned Rust requests.
   */
  security?: ProviderSecurity;
};

/**
 * Rust-sealed provider security snapshot used to validate secret-bearing requests.
 *
 * The visible `allowedOrigins` are stored for inspectability. Rust authenticates
 * them against `sealed` before making provider HTTP requests.
 */
export type ProviderSecurity = {
  /** Normalized HTTPS origins that this provider instance may request. */
  allowedOrigins: string[];
  /** AES-GCM authenticated payload containing the trusted security data. */
  sealed: string;
  /** Security payload schema version. */
  version: 1;
};

/** Provider settings map persisted under a provider instance. */
export type ProviderSettingsRecord = Record<string, ProviderSettingValue>;

/** Display option for a provider select field. */
export type ProviderSelectOption = {
  /** Persisted string value written when the option is selected. */
  value: string;
  /** Human-readable option label shown in the setup UI. */
  label: string;
};

/** Static or lazily resolved options for a provider select field. */
export type ProviderSelectOptions =
  | readonly ProviderSelectOption[]
  | (() =>
      | readonly ProviderSelectOption[]
      | Promise<readonly ProviderSelectOption[]>);

type ProviderFieldBase = {
  /**
   * Stable setting key.
   *
   * For group fields, nested values are accessed through this key, for example
   * `context.settings.auth.apiUrl`.
   */
  key: string;
  /** Human-readable field label shown in the setup UI. */
  label: string;
  /**
   * Whether the field must be supplied before saving.
   *
   * Optional non-secret fields are omitted from persisted settings when empty
   * and become `T | undefined` in {@link NonSecretProviderSettings}.
   */
  required: boolean;
  /** Optional placeholder shown by input-like controls. */
  placeholder?: string;
  /** Optional help text shown below the field. */
  description?: string;
};

type ProviderTextFieldBase = ProviderFieldBase & {
  /** Minimum allowed string length. */
  minLength?: number;
  /** Maximum allowed string length. */
  maxLength?: number;
  /** JavaScript regular expression source used to validate the string value. */
  pattern?: string;
  /** Text-like fields are never treated as secret values. */
  secret?: false;
};

/** Text-like provider field that cannot grant provider HTTP origin access. */
export type TextLikeProviderField = ProviderTextFieldBase & {
  /** Text-like control type to render and validate. */
  type: "text" | "email" | "textarea";
  /** Text, email, and textarea fields cannot grant provider HTTP access. */
  originAccess?: false;
};

/**
 * URL provider field.
 *
 * Set `originAccess: true` only when this URL is the provider API origin that
 * may receive secret-backed requests, such as a Jira site URL.
 */
export type UrlProviderField = ProviderTextFieldBase & {
  /** URL input field type. */
  type: "url";
  /**
   * Whether this URL contributes its HTTPS origin to the provider's sealed
   * allowed-origin list.
   *
   * When true, validation requires an HTTPS URL and changing the origin clears
   * preserved secrets unless replacements are submitted in the same save.
   */
  originAccess?: boolean;
};

/** Provider field for string-like values. */
export type TextProviderField = TextLikeProviderField | UrlProviderField;

/** Provider field for numeric values. */
export type NumberProviderField = ProviderFieldBase & {
  /** Numeric input field type. */
  type: "number";
  /** Minimum allowed numeric value. */
  min?: number;
  /** Maximum allowed numeric value. */
  max?: number;
  /** Native number input step size. */
  step?: number;
  /** Whether the value must be an integer. */
  integer?: boolean;
  /** Number fields are never treated as secret values. */
  secret?: false;
};

/** Provider field for boolean values rendered as a switch. */
export type BooleanProviderField = ProviderFieldBase & {
  /** Boolean switch field type. */
  type: "boolean";
  /** Boolean fields are never treated as secret values. */
  secret?: false;
};

/**
 * Provider field for date, time, or datetime values persisted as numbers.
 *
 * `date` and `datetime` values are persisted as epoch milliseconds and can be
 * converted to `Date`. `time` values are milliseconds since midnight.
 */
export type DateTimeProviderField = ProviderFieldBase & {
  /** Date-like field type. */
  type: "date" | "time" | "datetime";
  /** Minimum persisted numeric value. */
  min?: number;
  /** Maximum persisted numeric value. */
  max?: number;
  /** Date/time fields are never treated as secret values. */
  secret?: false;
};

/** Provider field whose value must match one of its configured options. */
export type SelectProviderField = ProviderFieldBase & {
  /** Select field type. */
  type: "select";
  /**
   * Static or lazy option source.
   *
   * Lazy functions can return options synchronously or through a promise. The
   * selected value is always persisted as a string.
   */
  options: ProviderSelectOptions;
  /** Select fields are never treated as secret values. */
  secret?: false;
};

/**
 * Provider field for sensitive values that Rust encrypts before persistence.
 *
 * Secret fields are omitted from {@link NonSecretProviderSettings}. Provider
 * Rust-owned provider commands can decrypt and use them without exposing them
 * to frontend code.
 */
export type SecretProviderField = ProviderFieldBase & {
  /** Secret input field type. */
  type: "secret";
  /** Marks this field as secret-bearing for Rust encryption and fetch injection. */
  secret: true;
};

/** Recursive provider field group rendered as an accordion section. */
export interface ProviderGroupField<
  Fields extends readonly ProviderField[] = readonly ProviderField[],
> extends Omit<ProviderFieldBase, "required"> {
  /** Group field type rendered as an accordion. */
  type: "group";
  /** Nested provider fields contained by this group. */
  fields: Fields;
  /** Whether the accordion should be open by default in the setup UI. */
  defaultOpen?: boolean;
  /** Groups are structural and are never required themselves. */
  required?: false;
  /** Groups are never treated as secret values. */
  secret?: false;
}

/** Non-secret field that stores a scalar value. */
export type ScalarNonSecretProviderField =
  | TextProviderField
  | NumberProviderField
  | BooleanProviderField
  | DateTimeProviderField
  | SelectProviderField;

/** Any non-secret field available after runtime conversion. */
export type NonSecretProviderField =
  | ScalarNonSecretProviderField
  | ProviderGroupField;

/** Complete provider setup field union, including groups and secrets. */
export type ProviderField =
  | NonSecretProviderField
  | SecretProviderField
  | ProviderGroupField;

/** Static HTTP origin access declared by a provider plugin. */
export type ProviderHttpAccess = {
  /**
   * Static HTTPS origins this provider may request.
   *
   * Dynamic origins should be modeled with URL fields that set
   * `originAccess: true`; static origins are for provider APIs that do not vary
   * per configured instance, such as `https://api.github.com`.
   */
  staticAllowedOrigins?: readonly string[];
};

/** Provider plugin metadata used by setup UI, security origin resolution, and registry lookup. */
export type ProviderPlugin<
  Type extends ProviderType = ProviderType,
  Fields extends readonly ProviderField[] = readonly ProviderField[],
> = {
  /** Unique provider plugin type. */
  type: Type;
  /** Human-readable provider name shown in setup UI. */
  label: string;
  /** Short description shown when selecting a provider. */
  description: string;
  /** Lucide icon component shown next to the provider. */
  icon: LucideIcon;
  /**
   * Setup fields rendered by the provider wizard.
   *
   * Use `as const satisfies ProviderPlugin<...>` in provider definitions to
   * preserve literal keys, required flags, and nested group types for
   * {@link NonSecretProviderSettings} inference.
   */
  fields: Fields;
  /** Capability short names this plugin can implement. */
  capabilities: readonly ProviderCapability[];
  /** Provider domains this plugin belongs to. */
  providerKinds: readonly ProviderKind[];
  /** Static HTTP access metadata used when sealing provider origins. */
  httpAccess?: ProviderHttpAccess;
};

/**
 * Non-secret settings with secret fields omitted and rich values converted.
 *
 * Required fields become required properties. Optional fields become optional
 * properties. Groups become nested objects. Secret fields are not present.
 */
export type NonSecretProviderSettings<Type extends ProviderType> =
  ProviderPluginForType<Type> extends ProviderPlugin<Type, infer Fields>
    ? NonSecretSettingsFromFields<Fields>
    : Record<string, ProviderSettingValue | Date | undefined>;

type RequiredNonSecretSettings<Fields extends readonly ProviderField[]> = {
  [Field in Fields[number] as Field extends { secret: true }
    ? never
    : Field extends { type: "group" }
      ? Field["key"]
      : Field extends { required: true }
        ? Field["key"]
        : never]: ImplementationValueForField<Field>;
};

type OptionalNonSecretSettings<Fields extends readonly ProviderField[]> = {
  [Field in Fields[number] as Field extends { secret: true }
    ? never
    : Field extends { type: "group" }
      ? never
      : Field extends { required: false }
        ? Field["key"]
        : never]?: ImplementationValueForField<Field>;
};

type NonSecretSettingsFromFields<Fields extends readonly ProviderField[]> =
  RequiredNonSecretSettings<Fields> & OptionalNonSecretSettings<Fields>;

type ImplementationValueForField<Field extends ProviderField> =
  Field extends ProviderGroupField<infer Fields>
    ? NonSecretSettingsFromFields<Fields>
    : Field extends { type: "number" | "time" }
      ? number
      : Field extends { type: "boolean" }
        ? boolean
        : Field extends { type: "date" | "datetime" }
          ? Date
          : string;

/** Known plugin metadata narrowed by provider type. */
export type ProviderPluginForType<Type extends ProviderType> = Extract<
  KnownProviderPlugin,
  { type: Type }
>;

/** Union of all provider plugins compiled into this frontend bundle. */
export type KnownProviderPlugin =
  | typeof import("./github/plugin").githubProviderPlugin
  | typeof import("./jira/plugin").jiraProviderPlugin;

const providerTypes: ProviderType[] = ["github", "jira"];

export function isProviderType(value: unknown): value is ProviderType {
  return providerTypes.includes(value as ProviderType);
}

export function isProviderSettingRecord(
  value: unknown,
): value is Record<string, ProviderSettingValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => isProviderSettingValue(entry));
}

function isProviderSettingValue(value: unknown): value is ProviderSettingValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  return isProviderSettingRecord(value);
}
