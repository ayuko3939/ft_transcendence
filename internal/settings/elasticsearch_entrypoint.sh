#!/bin/bash

set -x

# 環境変数チェック
if [ x${ELASTIC_PASSWORD} == x ]; then
    echo "Set the ELASTIC_PASSWORD environment variable in the .env file";
    exit 1;
elif [ x${KIBANA_PASSWORD} == x ]; then
    echo "Set the KIBANA_PASSWORD environment variable in the .env file";
    exit 1;
fi;

# CA証明書作成
if [ ! -f config/certs/ca.zip ]; then
    echo "Creating CA";
    bin/elasticsearch-certutil ca --silent --pem -out config/certs/ca.zip;
    unzip config/certs/ca.zip -d config/certs;
fi;

# SSL証明書作成
if [ ! -f config/certs/certs.zip ]; then
    echo "Creating certs";
    echo -ne \
    "instances:\n"\
    "  - name: elastic-search\n"\
    "    dns:\n"\
    "      - elastic-search\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 127.0.0.1\n"\
    "  - name: kibana\n"\
    "    dns:\n"\
    "      - kibana\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 127.0.0.1\n"\
    > config/certs/instances.yml;
    bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in config/certs/instances.yml --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key;
    unzip config/certs/certs.zip -d config/certs;
fi;

# ファイル権限設定
echo "Setting file permissions"
chown -R root:root config/certs;
find . -type d -exec chmod 750 \{\} \;;
find . -type f -exec chmod 640 \{\} \;;

# Elasticsearch起動待機
echo "Waiting for Elasticsearch availability";
until curl -s --cacert config/certs/ca/ca.crt https://elastic-search:9200 | grep -q "missing authentication credentials"; do sleep 30; done;

# kibana_systemパスワード設定
echo "Setting kibana_system password";
until curl -s -X POST --cacert config/certs/ca/ca.crt -u "elastic:${ELASTIC_PASSWORD}" -H "Content-Type: application/json" https://elastic-search:9200/_security/user/kibana_system/_password -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}"; do sleep 10; done;

# ======================
# ILMポリシー設定開始
# ======================

echo "Creating ILM policy: ft_transcendence-policy";

# ILMポリシー作成
curl -s -X PUT --cacert config/certs/ca/ca.crt \
  -u "elastic:${ELASTIC_PASSWORD}" \
  -H "Content-Type: application/json" \
  https://elastic-search:9200/_ilm/policy/ft_transcendence-policy \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_age": "1d"
            }
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }' > /dev/null

# インデックステンプレート作成
curl -s -X PUT --cacert config/certs/ca/ca.crt \
  -u "elastic:${ELASTIC_PASSWORD}" \
  -H "Content-Type: application/json" \
  https://elastic-search:9200/_index_template/logstash-template \
  -d '{
    "index_patterns": ["logstash-*"],
    "template": {
      "settings": {
        "index.lifecycle.name": "ft_transcendence-policy"
      }
    },
    "priority": 100
  }' > /dev/null

# 既存インデックスにポリシー適用
curl -s -X PUT --cacert config/certs/ca/ca.crt \
  -u "elastic:${ELASTIC_PASSWORD}" \
  -H "Content-Type: application/json" \
  https://elastic-search:9200/logstash-*/_settings \
  -d '{
    "index.lifecycle.name": "ft_transcendence-policy"
  }' > /dev/null

echo "ILM policy setup completed";

echo "All done!";