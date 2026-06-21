import type { ProviderType } from "./providerTypes"
import type {
  ProviderCapability,
  ProviderCapabilityImplementation,
  ProviderImplementationsForCapabilities,
} from "./capabilities"
import type { ProviderFetchFor } from "./providerHttp"
import type { NonSecretProviderSettings } from "./providerTypes"

/** Provider-neutral input for fetching pull request details. */
export type GetPRInput = {
  /** Repository owner or organization name. */
  owner: string
  /** Repository name without the owner prefix. */
  repo: string
  /** Pull request number within the repository. */
  pullNumber: number
}

/** Provider-neutral pull request details returned by a capability implementation. */
export type ProviderPR = {
  /** Provider-specific stable pull request id. */
  id: string
  /** Pull request title. */
  title: string
  /** Pull request body or description text. */
  description: string
  /** Browser URL for the pull request. */
  url: string
  /** Provider-neutral or provider-supplied state string. */
  state: string
  /** Provider type that produced this result. */
  sourceProvider: ProviderType
}

/** Provider-neutral input for fetching issue details. */
export type GetIssueInput = {
  /** Repository or project owner, depending on provider semantics. */
  owner: string
  /** Optional repository name for providers that scope issues to repositories. */
  repo?: string
  /** Issue number within the provider's issue scope. */
  issueNumber: number
}

/** Provider-neutral issue details returned by a capability implementation. */
export type ProviderIssue = {
  /** Provider-specific stable issue id. */
  id: string
  /** Issue title. */
  title: string
  /** Issue body or description text. */
  description: string
  /** Browser URL for the issue. */
  url: string
  /** Provider-neutral or provider-supplied state string. */
  state: string
  /** Provider type that produced this result. */
  sourceProvider: ProviderType
}

/** Runtime context passed to provider capability implementations. */
export type ProviderImplementationContext<Type extends ProviderType> = {
  /**
   * Typed non-secret provider settings.
   *
   * Secret fields are intentionally omitted. Date and datetime fields are
   * converted to `Date`, time fields are milliseconds since midnight, and
   * optional fields may be `undefined`.
   */
  settings: NonSecretProviderSettings<Type>
  /**
   * Provider-scoped fetch helper.
   *
   * Requests are executed by Rust so secrets can be decrypted and injected only
   * after sealed origin validation succeeds.
   */
  providerFetch: ProviderFetchFor
}

/** Type map defining every capability contract a provider can implement. */
export type ProviderCapabilityContractMap<Type extends ProviderType> = {
  /**
   * Fetches provider-neutral pull request details.
   *
   * Providers should implement this only when their plugin declares `PR`.
   */
  GetPR(
    input: GetPRInput,
    context: ProviderImplementationContext<Type>,
  ): Promise<ProviderPR>
  /**
   * Fetches provider-neutral pull requests details.
   *
   * Providers should implement this only when their plugin declares `PR`.
   */
  GetPRs(
    input: Omit<GetPRInput, "pullNumber">,
    context: ProviderImplementationContext<Type>,
  ): Promise<ProviderPR[]>
  /**
   * Fetches provider-neutral issue details.
   *
   * Providers should implement this only when their plugin declares `Issue`.
   */
  GetIssue(
    input: GetIssueInput,
    context: ProviderImplementationContext<Type>,
  ): Promise<ProviderIssue>
}

/** Partial implementation map for a provider plugin's supported capabilities. */
export type ProviderImplementation<Type extends ProviderType = ProviderType> =
  Partial<ProviderCapabilityContractMap<Type>>

/** Function type for one capability on one provider type. */
export type ProviderCapabilityFunction<
  Capability extends ProviderCapabilityImplementation,
  Type extends ProviderType = ProviderType,
> = ProviderCapabilityContractMap<Type>[Capability]

/** Input type for a named provider capability. */
export type ProviderCapabilityInput<
  Capability extends ProviderCapabilityImplementation,
> =
  Parameters<ProviderCapabilityContractMap<ProviderType>[Capability]>[0]

/** Promise result type for a named provider capability. */
export type ProviderCapabilityResult<
  Capability extends ProviderCapabilityImplementation,
> =
  ReturnType<ProviderCapabilityContractMap<ProviderType>[Capability]>

/** Callable runner exposed to app code after provider/capability checks pass. */
export type ProviderCapabilityRunner<
  Capability extends ProviderCapabilityImplementation,
> = (input: ProviderCapabilityInput<Capability>) => ProviderCapabilityResult<Capability>

/** Strict implementation type requiring all capabilities declared by a plugin. */
export type ProviderImplementationFor<
  Type extends ProviderType,
  Capabilities extends readonly ProviderCapability[],
> = Pick<
  ProviderCapabilityContractMap<Type>,
  ProviderImplementationsForCapabilities<Capabilities[number]>
>
