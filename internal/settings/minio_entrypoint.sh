#!/bin/sh

set -x

sleep 5

/usr/bin/mc config host add ft-transcendence http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

/usr/bin/mc mb ft-transcendence/${UPLOAD_BUCKET_NAME} --ignore-existing

cat > /tmp/read-only-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${UPLOAD_BUCKET_NAME}/*"]
    }
  ]
}
EOF
/usr/bin/mc policy set-json /tmp/read-only-policy.json ft-transcendence/${UPLOAD_BUCKET_NAME}

/usr/bin/mc anonymous set download ft-transcendence/${UPLOAD_BUCKET_NAME}

echo '===== MinIO initialization completed successfully ====='

exit 0