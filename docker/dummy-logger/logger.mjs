const opensearchUrl = process.env.OPENSEARCH_URL ?? "http://localhost:9200";
const indexAlias = process.env.LOG_INDEX_ALIAS ?? "dummy-app-logs";
const serviceName = process.env.SERVICE_NAME ?? "dummy-application";
const intervalMs = Number(process.env.LOG_INTERVAL_MS ?? 1000);

const levels = [
  { level: "debug", message: "Loaded feature flags", event: "feature_flags.loaded" },
  { level: "info", message: "Processed background sync", event: "sync.completed" },
  { level: "warning", message: "External provider latency is above target", event: "provider.latency_high" },
  { level: "error", message: "Failed to refresh repository cache", event: "repository_cache.refresh_failed" },
];

let sequence = 0;

async function waitForOpenSearch() {
  while (true) {
    try {
      const response = await fetch(`${opensearchUrl}/_cluster/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting until Docker networking and OpenSearch are ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

function createLogEntry(template) {
  sequence += 1;

  const requestId = `req-${String(sequence).padStart(6, "0")}`;
  const durationMs = Math.floor(25 + Math.random() * 900);
  const entry = {
    "@timestamp": new Date().toISOString(),
    service: serviceName,
    environment: "local-dev",
    level: template.level,
    message: template.message,
    event: template.event,
    requestId,
    durationMs,
    sequence,
    host: "dummy-logger",
  };

  if (template.level === "error") {
    entry.error = {
      name: "DummyProviderError",
      message: "Synthetic failure emitted for OpenSearch provider development",
      stack: "DummyProviderError: Synthetic failure\n    at refreshRepositoryCache (logger.mjs:1:1)",
    };
  }

  return entry;
}

async function writeLog(entry) {
  const response = await fetch(`${opensearchUrl}/${indexAlias}/_doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenSearch write failed: ${response.status} ${body}`);
  }
}

async function emitBatch() {
  const entries = levels.map(createLogEntry);

  await Promise.all(entries.map(writeLog));

  const summary = entries.map((entry) => entry.level).join(", ");
  console.log(`${new Date().toISOString()} wrote ${entries.length} logs: ${summary}`);
}

await waitForOpenSearch();
console.log(`Writing dummy logs to ${opensearchUrl}/${indexAlias}`);

await emitBatch();
setInterval(() => {
  emitBatch().catch((error) => {
    console.error(error);
  });
}, intervalMs);
