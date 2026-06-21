import type {
  GetIssueInput,
  ProviderIssue,
  ProviderImplementationContext,
} from "../../contracts"
import { withGithubRestClient } from "./client"

export async function getGitHubIssue(
  input: GetIssueInput,
  context: ProviderImplementationContext<"github">,
): Promise<ProviderIssue> {
  return await withGithubRestClient(context.providerFetch, async (client) => {
    const response = await client.rest.issues.get({
      issue_number: input.issueNumber,
      owner: input.owner,
      repo: input.repo ?? "",
    })

    return {
      id: String(response.data.id),
      title: response.data.title,
      description: response.data.body ?? "",
      url: response.data.html_url,
      state: response.data.state,
      sourceProvider: "github" as const,
    }
  })
}
