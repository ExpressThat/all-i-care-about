import { Octokit } from "@octokit/rest"
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql"
import { throttling } from "@octokit/plugin-throttling"
import type { ProviderFetchFor } from "../../providerHttp"
import { createGithubFetch } from "./fetch"

const MyOctokit = Octokit.plugin(throttling, paginateGraphQL)

type GitHubClient = InstanceType<typeof MyOctokit>

export async function withGithubRestClient<T>(
  fetchClient: ProviderFetchFor,
  callback: (client: GitHubClient) => Promise<T>,
) {
  const client = createGithubClient(fetchClient)

  return await callback(client)
}

export async function withGithubGraphQLClient<T>(
  fetchClient: ProviderFetchFor,
  callback: (client: GitHubClient["graphql"]) => Promise<T>,
) {
  const client = createGithubClient(fetchClient)

  return await callback(client.graphql)
}

function createGithubClient(fetchClient: ProviderFetchFor) {
  return new MyOctokit({
    request: {
      fetch: createGithubFetch(fetchClient),
    },
    throttle: {
      onRateLimit: (_retryAfter, _options, _octokit, retryCount) => {
        return retryCount < 1
      },
      onSecondaryRateLimit: () => {
        return false
      },
    },
  })
}
