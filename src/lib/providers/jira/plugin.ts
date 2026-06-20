import { Ticket } from "lucide-react"
import type { ProviderPlugin } from "../providerTypes"
import { jiraProviderCapabilities } from "./capabilities"

export const jiraProviderPlugin = {
  type: "jira",
  label: "Jira",
  description: "Connect Jira issues.",
  icon: Ticket,
  fields: [
    {
      key: "personalAccessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      secret: true,
      placeholder: "ghp_...",
      description: "Used by the GitHub provider to access pull requests and issues.",
    }
  ] as const,
  capabilities: jiraProviderCapabilities,
} satisfies ProviderPlugin
