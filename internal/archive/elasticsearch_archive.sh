#!/bin/bash

# ログアーカイブスクリプト（デバッグ版）
# 30日以上経過したElasticsearchインデックスをアーカイブ（起動時一回実行）

set -e

# 環境変数設定
ELASTIC_USER=${ELASTIC_USER:-elastic}
ELASTIC_PASSWORD=${ELASTIC_PASSWORD:-changeme}
ELASTIC_HOST=${ELASTIC_HOST:-elastic-search:9200}
ARCHIVE_DIR="/archive"
TMP_DIR="/tmp"
RETENTION_DAYS=1

# ログ出力関数
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >&2
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1"
}

log_debug() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEBUG] $1"
}

# 30日前の日付を計算
calculate_cutoff_date() {
    date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d
}

# 日付比較（YYYY-MM-DD形式）
is_older_than_cutoff() {
    local index_date="$1"
    local cutoff_date="$2"
    
    # 日付をタイムスタンプに変換して比較
    local index_timestamp=$(date -d "$index_date" +%s 2>/dev/null || echo 0)
    local cutoff_timestamp=$(date -d "$cutoff_date" +%s)
    
    [ "$index_timestamp" -lt "$cutoff_timestamp" ]
}

# Elasticsearch接続確認（デバッグ強化）
check_elasticsearch_connection() {
    log_info "Checking Elasticsearch connection..."
    log_debug "ELASTIC_USER: [$ELASTIC_USER]"
    log_debug "ELASTIC_PASSWORD: [${ELASTIC_PASSWORD:0:3}***]"
    log_debug "ELASTIC_HOST: [$ELASTIC_HOST]"
    
    # curl実行前の確認
    log_debug "Executing curl command with full verbosity..."
    
    # 生のcurl応答を取得
    local raw_response=$(curl -s --cacert /certs/ca/ca.crt \
        -u "${ELASTIC_USER}:${ELASTIC_PASSWORD}" \
        "https://${ELASTIC_HOST}/_cluster/health" 2>&1)
    local curl_exit_code=$?
    
    log_debug "Curl exit code: [$curl_exit_code]"
    log_debug "Raw response length: [${#raw_response}]"
    log_debug "Raw response: [$raw_response]"
    
    # curl失敗チェック
    if [ $curl_exit_code -ne 0 ]; then
        log_error "Curl command failed with exit code: $curl_exit_code"
        return 1
    fi
    
    # JSON形式チェック
    if ! echo "$raw_response" | grep -q '^{.*}$'; then
        log_error "Response is not valid JSON: [$raw_response]"
        return 1
    fi
    
    # status抽出のデバッグ
    log_debug "Extracting status field..."
    
    # ステップ1: grepでstatus部分を抽出
    local status_part=$(echo "$raw_response" | grep -o '"status":"[^"]*"')
    log_debug "Status part: [$status_part]"
    
    # ステップ2: cutで値を抽出
    local health_status=$(echo "$status_part" | cut -d'"' -f4)
    log_debug "Extracted health_status: [$health_status]"
    log_debug "Health_status length: [${#health_status}]"
    
    # 文字コード確認
    log_debug "Health_status hex dump: [$(echo -n "$health_status" | hexdump -C)]"
    
    # 条件分岐のデバッグ
    log_debug "Testing conditions..."
    
    if [ "$health_status" = "green" ]; then
        log_debug "Condition [health_status = green]: TRUE"
        log_info "Elasticsearch connection successful (status: green)"
        return 0
    else
        log_debug "Condition [health_status = green]: FALSE"
    fi
    
    if [ "$health_status" = "yellow" ]; then
        log_debug "Condition [health_status = yellow]: TRUE"
        log_info "Elasticsearch connection successful (status: yellow)"
        return 0
    else
        log_debug "Condition [health_status = yellow]: FALSE"
    fi
    
    # どちらの条件にも合わない場合
    log_error "Elasticsearch connection failed or unhealthy"
    log_error "Expected: 'green' or 'yellow', Got: '$health_status'"
    return 1
}

# 個別インデックスアーカイブ処理
archive_single_index() {
    local index_name="$1"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local json_file="${TMP_DIR}/${index_name}.json"
    local archive_file="${ARCHIVE_DIR}/${index_name}-${timestamp}.tar.gz"
    
    log_info "Starting archive process for index: $index_name"
    
    # 1. JSONエクスポート
    log_info "Exporting JSON data for $index_name..."
    if ! curl -s --cacert /certs/ca/ca.crt \
        -u "${ELASTIC_USER}:${ELASTIC_PASSWORD}" \
        -X POST "https://${ELASTIC_HOST}/${index_name}/_search?scroll=1m&size=1000" \
        -H "Content-Type: application/json" \
        -d '{"query": {"match_all": {}}}' \
        > "$json_file"; then
        log_error "Failed to export JSON for $index_name"
        return 1
    fi
    
    # JSONファイルサイズ確認
    local json_size=$(stat -c%s "$json_file" 2>/dev/null || echo 0)
    if [ "$json_size" -eq 0 ]; then
        log_error "JSON export resulted in empty file for $index_name"
        rm -f "$json_file"
        return 1
    fi
    
    log_info "JSON export completed: $(printf "%.1f" $(echo "scale=1; $json_size/1024" | bc))KB"
    
    # 2. tar.gz圧縮
    log_info "Compressing to archive: $archive_file"
    if ! (cd "$TMP_DIR" && tar -czf "$archive_file" "$(basename "$json_file")"); then
        log_error "Failed to compress $index_name"
        rm -f "$json_file"
        return 1
    fi
    
    # 圧縮ファイルサイズ確認
    local archive_size=$(stat -c%s "$archive_file" 2>/dev/null || echo 0)
    if [ "$archive_size" -eq 0 ]; then
        log_error "Archive compression resulted in empty file for $index_name"
        rm -f "$json_file" "$archive_file"
        return 1
    fi
    
    log_info "Compression completed: $(basename "$archive_file") ($(printf "%.1f" $(echo "scale=1; $archive_size/1024" | bc))KB)"
    
    # 3. 元インデックス削除
    log_info "Deleting original index: $index_name"
    local delete_response=$(curl -s -X DELETE --cacert /certs/ca/ca.crt \
        -u "${ELASTIC_USER}:${ELASTIC_PASSWORD}" \
        "https://${ELASTIC_HOST}/${index_name}")
    
    if echo "$delete_response" | grep -q '"acknowledged":true'; then
        log_info "Original index $index_name deleted successfully"
    else
        log_warn "Failed to delete original index $index_name: $delete_response"
    fi
    
    # 4. 一時ファイル削除
    rm -f "$json_file"
    
    log_info "Archive process completed for $index_name"
    return 0
}

# 全インデックスアーカイブチェック
check_and_archive_all_old_indices() {
    local cutoff_date=$(calculate_cutoff_date)
    log_info "Checking for indices older than $cutoff_date (${RETENTION_DAYS} days ago)"
    
    # 全logstashインデックス一覧を取得
    local indices_list=$(curl -s --cacert /certs/ca/ca.crt \
        -u "${ELASTIC_USER}:${ELASTIC_PASSWORD}" \
        "https://${ELASTIC_HOST}/_cat/indices/logstash-*?h=index" 2>/dev/null)
    
    if [ -z "$indices_list" ]; then
        log_warn "No logstash indices found"
        return 0
    fi
    
    local archived_count=0
    local total_indices=$(echo "$indices_list" | wc -l)
    
    log_info "Found $total_indices logstash indices"
    
    # 各インデックスの日付チェック
    for index in $indices_list; do
        # インデックス名から日付を抽出（logstash-YYYY.MM.DD）
        if [[ $index =~ logstash-([0-9]{4})\.([0-9]{2})\.([0-9]{2}) ]]; then
            local index_date="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
            
            if is_older_than_cutoff "$index_date" "$cutoff_date"; then
                log_info "Found old index: $index (date: $index_date)"
                if archive_single_index "$index"; then
                    archived_count=$((archived_count + 1))
                else
                    log_error "Failed to archive $index"
                fi
            else
                log_info "Index $index is within retention period (date: $index_date)"
            fi
        else
            log_warn "Index $index does not match expected format (logstash-YYYY.MM.DD)"
        fi
    done
    
    log_info "Archive check completed: $archived_count indices archived out of $total_indices total"
}

# メイン処理
main() {
    log_info "=== Log Archive Process Started (DEBUG MODE) ==="
    
    # ディレクトリ作成
    mkdir -p "$ARCHIVE_DIR" "$TMP_DIR"
    
    # Elasticsearch接続確認
    if ! check_elasticsearch_connection; then
        log_error "Cannot connect to Elasticsearch. Exiting."
        exit 1
    fi
    
    # アーカイブ処理実行
    check_and_archive_all_old_indices
    
    log_info "=== Log Archive Process Completed ==="
    
    # 起動時一回実行のため、プロセス終了
    log_info "Archive process finished. Container will exit."
}

# スクリプト実行
main "$@"