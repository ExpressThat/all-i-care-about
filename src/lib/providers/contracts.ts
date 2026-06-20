import type { ProviderType } from "./providerTypes"
import type { ProviderCapability } from "./capabilities"

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

export type ProviderCapabilityContractMap = {
  GetPR(input: GetPRInput): Promise<ProviderPR>
  GetIssue(input: GetIssueInput): Promise<ProviderIssue>
}

export type ProviderImplementation = Partial<ProviderCapabilityContractMap>

export type ProviderCapabilityFunction<
  Capability extends ProviderCapability,
> = ProviderCapabilityContractMap[Capability]

export type ProviderCapabilityInput<Capability extends ProviderCapability> =
  Parameters<ProviderCapabilityFunction<Capability>>[0]

export type ProviderCapabilityResult<Capability extends ProviderCapability> =
  ReturnType<ProviderCapabilityFunction<Capability>>

export type ProviderImplementationFor<
  Capabilities extends readonly ProviderCapability[],
> = Pick<ProviderCapabilityContractMap, Capabilities[number]>
