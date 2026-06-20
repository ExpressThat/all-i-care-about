import type {
  GetIssueInput,
  ProviderImplementationFor,
} from "../contracts"
import { jiraProviderCapabilities } from "./capabilities"

type JiraProviderImplementation = ProviderImplementationFor<
  typeof jiraProviderCapabilities
>

export const jiraProviderImplementation: JiraProviderImplementation = {
  async GetIssue(_input: GetIssueInput) {
    throw new Error("GitHub GetIssue is not implemented yet.")
  },
}
