import type { ProviderImplementationFor } from "../../contracts"
import type { githubProviderCapabilities } from "../capabilities"

export type GitHubProviderImplementation = ProviderImplementationFor<
  "github",
  typeof githubProviderCapabilities
>
