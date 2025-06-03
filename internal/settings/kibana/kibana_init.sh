#!/bin/bash
set -e

echo "=== Kibana ダッシュボード自動インポート開始 ==="

DASHBOARD_FILE="/kibana-config/frontend-dashboard.ndjson"
KIBANA_URL="http://kibana:5601"
# 正しい認証情報を環境変数から取得
KIBANA_USERNAME="elastic"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"

echo "[INFO] Kibana URL: $KIBANA_URL"
echo "[INFO] 認証ユーザー: $KIBANA_USERNAME"

# Kibanaの起動を待機（jqを使わない方法）
echo "[INFO] Kibanaの起動を待機中..."
RETRY_COUNT=0
MAX_RETRIES=60

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "[INFO] 接続試行 $((RETRY_COUNT + 1))/$MAX_RETRIES..."
  
  # ステータスAPIをテスト
  if RESPONSE=$(curl -s -w "%{http_code}" -u "$KIBANA_USERNAME:$KIBANA_PASSWORD" "$KIBANA_URL/api/status" -o /tmp/kibana_status.json 2>/dev/null); then
    echo "[DEBUG] HTTPステータスコード: $RESPONSE"
    
    # ステータスコードが200の場合
    if [ "$RESPONSE" = "200" ]; then
      echo "[DEBUG] レスポンス内容:"
      cat /tmp/kibana_status.json
      
      # jqがない場合のための簡易チェック（"available"文字列を含むかどうか）
      if grep -q '"level":"available"' /tmp/kibana_status.json 2>/dev/null; then
        echo "[INFO] Kibanaは正常に起動しています。"
        break
      else
        echo "[INFO] Kibanaはまだ初期化中です..."
      fi
    else
      echo "[WARN] 予期しないHTTPステータス: $RESPONSE"
    fi
  else
    echo "[WARN] curl 実行に失敗しました（試行 $((RETRY_COUNT + 1))）"
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "[INFO] 15秒後に再試行します..."
    sleep 15
  fi
done

# タイムアウトチェック
if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "[ERROR] Kibanaの起動待機がタイムアウトしました"
  exit 1
fi

echo "[INFO] ダッシュボードファイルの確認..."
if [ ! -f "$DASHBOARD_FILE" ]; then
  echo "[ERROR] ダッシュボードファイルが見つかりません: $DASHBOARD_FILE"
  exit 1
fi

echo "[INFO] ダッシュボードファイルサイズ: $(wc -c < "$DASHBOARD_FILE") bytes"

echo "[INFO] ダッシュボード・Visualization・インデックスパターンをインポート中..."
IMPORT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "${KIBANA_URL}/api/saved_objects/_import" \
  -u "$KIBANA_USERNAME:$KIBANA_PASSWORD" \
  -H "kbn-xsrf: true" \
  -F "file=@${DASHBOARD_FILE}" \
  -o /tmp/import_result.json)

echo "[DEBUG] インポートHTTPステータス: $IMPORT_RESPONSE"
echo "[DEBUG] インポート結果:"
cat /tmp/import_result.json

if [ "$IMPORT_RESPONSE" = "200" ]; then
  echo "[SUCCESS] ダッシュボードのインポートが成功しました"
else
  echo "[ERROR] ダッシュボードのインポートに失敗しました"
  exit 1
fi

echo -e "\n=== Kibanaダッシュボード自動インポート完了 ==="
echo "Kibana URL: ${KIBANA_URL}"