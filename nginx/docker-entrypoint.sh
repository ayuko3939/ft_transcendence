#!/bin/sh
set -e

# ログディレクトリの作成と権限設定
mkdir -p /logstash
chown nginx:nginx /logstash
chmod 755 /logstash

# 環境変数の設定（デフォルト値）
SERVER_NAME=${SERVER_NAME:-localhost}
IP_ADDRESS=${IP_ADDRESS:-127.0.0.1}

# 設定ファイルの環境変数置換
envsubst '${SERVER_NAME}' < /etc/nginx/conf.d/pong-game.conf.template > /etc/nginx/conf.d/pong-game.conf

# 自己署名証明書が存在しない場合は作成
if [ ! -f /etc/nginx/ssl/nginx.crt ] || [ ! -f /etc/nginx/ssl/nginx.key ]; then
    echo "Generating self-signed SSL certificate..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/nginx.key \
            -out /etc/nginx/ssl/nginx.crt \
            -subj "/C=JP/ST=Tokyo/L=Shinjuku/O=42Tokyo/CN=${SERVER_NAME}" \
            -addext "subjectAltName=DNS:${SERVER_NAME},IP:${IP_ADDRESS}"
    chmod 644 /etc/nginx/ssl/nginx.key
    echo "SSL certificate generated."
fi

# Nginx を起動
exec "$@"