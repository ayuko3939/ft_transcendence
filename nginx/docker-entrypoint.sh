#!/bin/sh
set -e

# 自己署名証明書が存在しない場合は作成
if [ ! -f /etc/nginx/ssl/nginx.crt ] || [ ! -f /etc/nginx/ssl/nginx.key ]; then
    echo "Generating self-signed SSL certificate..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/nginx.key \
            -out /etc/nginx/ssl/nginx.crt \
            -subj "/C=JP/ST=Tokyo/L=Shinjuku/O=42Tokyo/CN=localhost" \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    chmod 644 /etc/nginx/ssl/nginx.key
    echo "SSL certificate generated."
fi

# Nginx を起動
exec "$@"