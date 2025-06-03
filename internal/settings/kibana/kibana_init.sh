#!/bin/sh
set -e

DASHBOARD_FILE="/kibana-config/frontend-dashboard.ndjson"
KIBANA_URL="http://kibana:5601"
AUTH="${ELASTIC_USER}:${ELASTIC_PASSWORD}"

# Kibanaの起動待機
while ! curl -s -u "$AUTH" "$KIBANA_URL/api/status" | grep -q '"level":"available"'; do
  echo "Kibana waiting for availability...(sleeping 15 seconds)"
  sleep 15
done

# ダッシュボードインポート
curl -s -X POST "$KIBANA_URL/api/saved_objects/_import" \
  -u "$AUTH" \
  -H "kbn-xsrf: true" \
  -F "file=@$DASHBOARD_FILE" | grep -q '"success":true' &&
  echo "import success" || { echo "import failed" ; exit 1; }