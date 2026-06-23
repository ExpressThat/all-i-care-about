#!/bin/sh
set -eu

DASHBOARDS_URL="${DASHBOARDS_URL:-http://opensearch-dashboards:5601}"
INDEX_PATTERN_ID="${DASHBOARDS_INDEX_PATTERN_ID:-dummy-app-logs}"
INDEX_PATTERN_TITLE="${DASHBOARDS_INDEX_PATTERN_TITLE:-dummy-app-logs}"
TIME_FIELD="${DASHBOARDS_TIME_FIELD:-@timestamp}"

echo "Waiting for OpenSearch Dashboards at ${DASHBOARDS_URL}"
until curl -fsS "${DASHBOARDS_URL}/api/status" >/dev/null 2>&1; do
  sleep 2
done

echo "Creating Dashboards data view ${INDEX_PATTERN_TITLE}"
curl -fsS -X POST "${DASHBOARDS_URL}/api/saved_objects/index-pattern/${INDEX_PATTERN_ID}?overwrite=true" \
  -H "Content-Type: application/json" \
  -H "osd-xsrf: true" \
  -d "{
    \"attributes\": {
      \"title\": \"${INDEX_PATTERN_TITLE}\",
      \"timeFieldName\": \"${TIME_FIELD}\"
    }
  }" >/dev/null

echo "Setting ${INDEX_PATTERN_TITLE} as the default Dashboards data view"
curl -fsS -X POST "${DASHBOARDS_URL}/api/opensearch-dashboards/settings/defaultIndex" \
  -H "Content-Type: application/json" \
  -H "osd-xsrf: true" \
  -d "{
    \"value\": \"${INDEX_PATTERN_ID}\"
  }" >/dev/null

echo "Dashboards data view ${INDEX_PATTERN_TITLE} is ready"
