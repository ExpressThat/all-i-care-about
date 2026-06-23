#!/bin/sh
set -eu

OPENSEARCH_URL="${OPENSEARCH_URL:-http://opensearch:9200}"
INDEX_NAME="${LOG_INDEX_NAME:-dummy-app-logs-000001}"
INDEX_ALIAS="${LOG_INDEX_ALIAS:-dummy-app-logs}"

echo "Waiting for OpenSearch at ${OPENSEARCH_URL}"
until curl -fsS "${OPENSEARCH_URL}/_cluster/health" >/dev/null; do
  sleep 2
done

echo "Creating log index template"
curl -fsS -X PUT "${OPENSEARCH_URL}/_index_template/dummy-app-logs-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["dummy-app-logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0
      },
      "mappings": {
        "dynamic": true,
        "properties": {
          "@timestamp": { "type": "date" },
          "service": { "type": "keyword" },
          "environment": { "type": "keyword" },
          "level": { "type": "keyword" },
          "message": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
          "event": { "type": "keyword" },
          "requestId": { "type": "keyword" },
          "durationMs": { "type": "integer" },
          "error": {
            "properties": {
              "name": { "type": "keyword" },
              "message": { "type": "text" },
              "stack": { "type": "text" }
            }
          }
        }
      }
    }
  }' >/dev/null

if curl -fsS "${OPENSEARCH_URL}/${INDEX_NAME}" >/dev/null 2>&1; then
  echo "Index ${INDEX_NAME} already exists"
else
  echo "Creating index ${INDEX_NAME} with write alias ${INDEX_ALIAS}"
  curl -fsS -X PUT "${OPENSEARCH_URL}/${INDEX_NAME}" \
    -H "Content-Type: application/json" \
    -d "{
      \"aliases\": {
        \"${INDEX_ALIAS}\": {
          \"is_write_index\": true
        }
      }
    }" >/dev/null
fi

echo "Alias ${INDEX_ALIAS} is ready"
