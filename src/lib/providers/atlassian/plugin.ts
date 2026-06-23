import { Ticket } from "lucide-react";
import type { ProviderPlugin } from "../providerTypes";
import { atlassianProviderCapabilities } from "./capabilities";

export const atlassianProviderPlugin = {
  type: "atlassian",
  label: "Atlassian",
  description: "Connect Atlassian issues.",
  icon: Ticket,
  fields: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      required: true,
      originAccess: true,
      placeholder: "https://example.atlassian.net",
      description: "The Atlassian site origin this provider can contact.",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      required: true,
      placeholder: "you@example.com",
      description:
        "Used with the API token for Atlassian Cloud authentication.",
    },
    {
      key: "personalAccessToken",
      label: "API Token",
      type: "secret",
      required: true,
      secret: true,
      placeholder: "ATATT...",
      description: "Encrypted and used by Rust for Atlassian API requests.",
    },
  ] as const,
  capabilities: atlassianProviderCapabilities,
  providerKinds: ["issue"],
} satisfies ProviderPlugin;
