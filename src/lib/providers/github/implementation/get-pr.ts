import type {
  GetPRInput,
  ProviderPR,
  ProviderImplementationContext,
} from "../../contracts"
import { withGithubRestClient } from "./client"

const maxPullRequests = 200

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


export async function getGitHubPRs(
  input: Omit<GetPRInput, "pullNumber">,
  context: ProviderImplementationContext<"github">,
): Promise<ProviderPR[]> {
  return await withGithubRestClient(context.providerFetch, async (client) => {
    let pullRequestCount = 0
    const pullRequests = await client.paginate(
      client.rest.pulls.list,
      {
        owner: input.owner,
        repo: input.repo,
        per_page: 100,
        state: "all",
      },
      (response, done) => {
        pullRequestCount += response.data.length
        if (pullRequestCount >= maxPullRequests) {
          done()
        }

        return response.data
      },
    )

    return pullRequests.slice(0, maxPullRequests).map((pullRequest) => ({
      id: String(pullRequest.id),
      title: pullRequest.title,
      description: pullRequest.body ?? "",
      url: pullRequest.html_url,
      state: pullRequest.state,
      sourceProvider: "github" as const,
    }))
  })
}
