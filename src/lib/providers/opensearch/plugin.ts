import { Search } from "lucide-react";
import type { ProviderPlugin } from "../providerTypes";
import { openSearchProviderCapabilities } from "./capabilities";

export const openSearchProviderPlugin = {
  type: "opensearch",
  label: "OpenSearch",
  description: "Connect OpenSearch logs.",
  icon: Search,
  fields: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      required: true,
      originAccess: true,
      placeholder: "http://localhost:9200",
      description: "The OpenSearch origin this provider can contact.",
    },
    {
      key: "indexAlias",
      label: "Index Alias",
      type: "text",
      required: true,
      placeholder: "dummy-app-logs",
      description: "The OpenSearch index alias to query for logs.",
    },
    {
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      placeholder: "Select authentication",
      description: "How this provider should authenticate to OpenSearch.",
      options: [
        { value: "none", label: "None" },
        { value: "basic", label: "Basic" },
        { value: "bearer", label: "Bearer Token" },
      ],
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
      description: "Username for basic authentication.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: false,
      secret: true,
      placeholder: "password",
      description: "Encrypted password for basic authentication.",
    },
    {
      key: "bearerToken",
      label: "Bearer Token",
      type: "secret",
      required: false,
      secret: true,
      placeholder: "token",
      description: "Encrypted bearer token for token-based authentication.",
    },
  ] as const,
  capabilities: openSearchProviderCapabilities,
  providerKinds: ["logging"],
} satisfies ProviderPlugin;
