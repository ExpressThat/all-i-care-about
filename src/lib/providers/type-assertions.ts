import type { ProviderInstance } from "./providerTypes"
import {
  getProviderCapabilityImplementation,
  runProviderCapability,
  useProviderImp,
} from "./registry"

declare const githubProvider: ProviderInstance<"github">
declare const jiraProvider: ProviderInstance<"jira">

void useProviderImp("github", "GetPR")
void useProviderImp("github", "GetPRs")
void useProviderImp("github", "GetIssue")
void useProviderImp("jira", "GetIssue")

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void useProviderImp("jira", "GetPR")

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void useProviderImp("jira", "GetPRs")

void getProviderCapabilityImplementation(githubProvider, "GetPR")
void getProviderCapabilityImplementation(githubProvider, "GetPRs")
void getProviderCapabilityImplementation(githubProvider, "GetIssue")
void getProviderCapabilityImplementation(jiraProvider, "GetIssue")

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void getProviderCapabilityImplementation(jiraProvider, "GetPR")

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void getProviderCapabilityImplementation(jiraProvider, "GetPRs")

void runProviderCapability(githubProvider, "GetPR", {
  owner: "octokit",
  repo: "endpoint.js",
  pullNumber: 563,
})
void runProviderCapability(githubProvider, "GetPRs", {
  owner: "octokit",
  repo: "endpoint.js",
})
void runProviderCapability(githubProvider, "GetIssue", {
  owner: "octokit",
  repo: "endpoint.js",
  issueNumber: 1,
})
void runProviderCapability(jiraProvider, "GetIssue", {
  owner: "AICA",
  issueNumber: 1,
})

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void runProviderCapability(jiraProvider, "GetPR", {
  owner: "octokit",
  repo: "endpoint.js",
  pullNumber: 563,
})

// @ts-expect-error Jira is an issue provider and cannot expose pull request capabilities.
void runProviderCapability(jiraProvider, "GetPRs", {
  owner: "octokit",
  repo: "endpoint.js",
})
