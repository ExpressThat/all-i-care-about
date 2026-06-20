import type {
  GetIssueInput,
  GetPRInput,
  ProviderImplementationContext,
  ProviderImplementationFor,
} from "../contracts"
import { githubProviderCapabilities } from "./capabilities"

type GitHubProviderImplementation = ProviderImplementationFor<
  "github",
  typeof githubProviderCapabilities
>

export const githubProviderImplementation: GitHubProviderImplementation = {
  async GetPR(
    _input: GetPRInput,
    _context: ProviderImplementationContext<"github">,
  ) {
    console.log(await _context.providerFetch("https://jsonplaceholder.typicode.com/posts", {}).then(x => x.json()));
    throw new Error("GitHub GetPR is not implemented yet.")
  },
  async GetIssue(
    _input: GetIssueInput,
    _context: ProviderImplementationContext<"github">,
  ) {
    throw new Error("GitHub GetIssue is not implemented yet.")
  },
}
