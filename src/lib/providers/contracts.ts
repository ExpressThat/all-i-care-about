import type { ProviderType } from "./providerTypes"
import type { ProviderCapability } from "./capabilities"
import type { ProviderFetchFor } from "./providerHttp"
import type { NonSecretProviderSettings } from "./providerTypes"

export type GetPRInput = {
  owner: string
  repo: string
  pullNumber: number
}

export type ProviderPR = {
  id: string
  title: string
  description: string
  url: string
  state: string
  sourceProvider: ProviderType
}

export type GetIssueInput = {
  owner: string
  repo?: string
  issueNumber: number
}

export type ProviderIssue = {
  id: string
  title: string
  description: string
  url: string
  state: string
  sourceProvider: ProviderType
}

export type ProviderImplementationContext<Type extends ProviderType> = {
  settings: NonSecretProviderSettings<Type>
  providerFetch: ProviderFetchFor
}

export type ProviderCapabilityContractMap<Type extends ProviderType> = {
  GetPR(
    input: GetPRInput,
    context: ProviderImplementationContext<Type>,
  ): Promise<ProviderPR>
  GetIssue(
    input: GetIssueInput,
    context: ProviderImplementationContext<Type>,
  ): Promise<ProviderIssue>
}

export type ProviderImplementation<Type extends ProviderType = ProviderType> =
  Partial<ProviderCapabilityContractMap<Type>>

export type ProviderCapabilityFunction<
  Capability extends ProviderCapability,
  Type extends ProviderType = ProviderType,
> = ProviderCapabilityContractMap<Type>[Capability]

export type ProviderCapabilityInput<Capability extends ProviderCapability> =
  Parameters<ProviderCapabilityContractMap<ProviderType>[Capability]>[0]

export type ProviderCapabilityResult<Capability extends ProviderCapability> =
  ReturnType<ProviderCapabilityContractMap<ProviderType>[Capability]>

export type ProviderCapabilityRunner<Capability extends ProviderCapability> = (
  input: ProviderCapabilityInput<Capability>,
) => ProviderCapabilityResult<Capability>

export type ProviderImplementationFor<
  Type extends ProviderType,
  Capabilities extends readonly ProviderCapability[],
> = Pick<ProviderCapabilityContractMap<Type>, Capabilities[number]>
