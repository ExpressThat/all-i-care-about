import type {
  GetIssueInput,
  ProviderImplementationContext,
  ProviderImplementationFor,
} from "../contracts"
import { jiraProviderCapabilities } from "./capabilities"

type JiraProviderImplementation = ProviderImplementationFor<
  "jira",
  typeof jiraProviderCapabilities
>

export const jiraProviderImplementation: JiraProviderImplementation = {
  async GetIssue(
    _input: GetIssueInput,
    _context: ProviderImplementationContext<"jira">,
  ) {
    throw new Error("Jira GetIssue is not implemented yet.")
  },
}
