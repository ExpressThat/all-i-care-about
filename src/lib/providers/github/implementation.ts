import type {
  GetIssueInput,
  GetPRInput,
  ProviderImplementationFor,
} from "../contracts"
import { githubProviderCapabilities } from "./capabilities"

type GitHubProviderImplementation = ProviderImplementationFor<
  typeof githubProviderCapabilities
>

export const githubProviderImplementation: GitHubProviderImplementation = {
  async GetPR(_input: GetPRInput) {
    throw new Error("GitHub GetPR is not implemented yet.")
  },
  async GetIssue(_input: GetIssueInput) {
    throw new Error("GitHub GetIssue is not implemented yet.")
  },
}
