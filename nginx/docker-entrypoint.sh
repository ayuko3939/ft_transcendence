#!/bin/sh
set -e

# ログディレクトリの作成と権限設定
mkdir -p /logstash
chown nginx:nginx /logstash
chmod 755 /logstash

# 自己署名証明書が存在しない場合は作成
if [ ! -f /etc/nginx/ssl/nginx.crt ] || [ ! -f /etc/nginx/ssl/nginx.key ]; then
    echo "Generating self-signed SSL certificate..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/nginx.key \
            -out /etc/nginx/ssl/nginx.crt \
            -subj "/C=JP/ST=Tokyo/L=Shinjuku/O=42Tokyo/CN=ft-transcendence.gawingowin.systems" \
            -addext "subjectAltName=DNS:ft-transcendence.gawingowin.systems,IP:10.12.3.9"
    chmod 644 /etc/nginx/ssl/nginx.key
    echo "SSL certificate generated."
fi

# Nginx を起動
exec "$@"