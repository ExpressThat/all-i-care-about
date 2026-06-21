import { Ticket } from "lucide-react";
import type { ProviderPlugin } from "../providerTypes";
import { jiraProviderCapabilities } from "./capabilities";

export const jiraProviderPlugin = {
  type: "jira",
  label: "Jira",
  description: "Connect Jira issues.",
  icon: Ticket,
  fields: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      required: true,
      originAccess: true,
      placeholder: "https://example.atlassian.net",
      description: "The Jira site origin this provider can contact.",
    },
    {
      key: "personalAccessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      secret: true,
      placeholder: "ATATT...",
      description: "Used by the Jira provider to access issues.",
    },
  ] as const,
  capabilities: jiraProviderCapabilities,
  providerKinds: ["issue"],
} satisfies ProviderPlugin;
