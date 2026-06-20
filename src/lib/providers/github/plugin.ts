import { GitPullRequest } from "lucide-react"
import type { ProviderPlugin } from "../providerTypes"
import { githubProviderCapabilities } from "./capabilities"

export const githubProviderPlugin = {
  type: "github",
  label: "GitHub",
  description: "Connect GitHub pull requests and issues.",
  icon: GitPullRequest,
  fields: [
    {
      key: "personalAccessToken",
      label: "Personal Access Token",
      type: "password",
      required: true,
      secret: true,
      placeholder: "ghp_...",
      description: "Used by the GitHub provider to access pull requests and issues.",
    },
  ],
  capabilities: githubProviderCapabilities,
} satisfies ProviderPlugin
