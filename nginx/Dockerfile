# nginx/Dockerfile
FROM nginx:alpine

# 必要なパッケージをインストール
RUN apk add --no-cache openssl

# 起動スクリプトを作成
COPY ./nginx/docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# SSL証明書用ディレクトリを作成
RUN mkdir -p /etc/nginx/ssl

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]