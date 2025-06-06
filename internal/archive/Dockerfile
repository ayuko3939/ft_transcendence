FROM alpine:3.20

# 必要パッケージのインストール
RUN apk add --no-cache \
    curl \
    tar \
    gzip \
    bash \
    tzdata \
    coreutils \
    bc

# タイムゾーン設定（日本時間）
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ディレクトリ作成
WORKDIR /app
RUN mkdir -p /archive /tmp

# アーカイブスクリプトのコピーと実行権限付与
COPY ./elasticsearch_archive.sh /app/elasticsearch_archive.sh
RUN chmod +x /app/elasticsearch_archive.sh

# スクリプト実行
CMD ["/app/elasticsearch_archive.sh"]

# デバッグ用のCMD
# CMD ["sh", "-c", "echo 'Debug mode'; sleep infinity"]