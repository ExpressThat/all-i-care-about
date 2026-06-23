import { Search } from "lucide-react";
import {
  defineProviderFieldShow,
  type ProviderPlugin,
  type ProviderSettingsRecord,
} from "../providerTypes";
import { openSearchProviderCapabilities } from "./capabilities";

const openSearchAuthModes = [
  { value: "none", label: "None" },
  { value: "basic", label: "Basic" },
  { value: "bearer", label: "Bearer Token" },
] as const;

type OpenSearchProviderSettings = ProviderSettingsRecord & {
  apiUrl?: string;
  authMode?: (typeof openSearchAuthModes)[number]["value"];
  username?: string;
  password?: string;
  bearerToken?: string;
};

const showOpenSearchField = defineProviderFieldShow<OpenSearchProviderSettings>;

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
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      placeholder: "Select authentication",
      description: "How this provider should authenticate to OpenSearch.",
      options: openSearchAuthModes,
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
      description: "Username for basic authentication.",
      show: showOpenSearchField((settings) => settings.authMode === "basic"),
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: false,
      secret: true,
      placeholder: "password",
      description: "Encrypted password for basic authentication.",
      show: showOpenSearchField((settings) => settings.authMode === "basic"),
    },
    {
      key: "bearerToken",
      label: "Bearer Token",
      type: "secret",
      required: false,
      secret: true,
      placeholder: "token",
      description: "Encrypted bearer token for token-based authentication.",
      show: showOpenSearchField((settings) => settings.authMode === "bearer"),
    },
  ] as const,
  capabilities: openSearchProviderCapabilities,
  providerKinds: ["logging"],
} satisfies ProviderPlugin;
