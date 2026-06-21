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
      key: "email",
      label: "Email",
      type: "email",
      required: true,
      placeholder: "you@example.com",
      description: "Used with the Jira API token for Atlassian Cloud authentication.",
    },
    {
      key: "personalAccessToken",
      label: "API Token",
      type: "secret",
      required: true,
      secret: true,
      placeholder: "ATATT...",
      description: "Encrypted and used by Rust for Jira API requests.",
    },
  ] as const,
  capabilities: jiraProviderCapabilities,
  providerKinds: ["issue"],
} satisfies ProviderPlugin;
