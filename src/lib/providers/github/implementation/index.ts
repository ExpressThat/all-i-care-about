import { getGitHubIssue } from "./get-issue"
import { getGitHubPR } from "./get-pr"
import type { GitHubProviderImplementation } from "./types"

export const githubProviderImplementation: GitHubProviderImplementation = {
  GetPR: getGitHubPR,
  GetIssue: getGitHubIssue,
}
