import type {
  GetPRInput,
  ProviderPR,
  ProviderImplementationContext,
} from "../../contracts"
import { withGithubRestClient } from "./client"

export async function getGitHubPR(
  input: GetPRInput,
  context: ProviderImplementationContext<"github">,
): Promise<ProviderPR> {
  return await withGithubRestClient(context.providerFetch, async (client) => {
    const response = await client.rest.pulls.get({
      owner: input.owner,
      pull_number: input.pullNumber,
      repo: input.repo,
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
