#!/bin/sh

set -x

sleep 5

/usr/bin/mc config host add ft-transcendence http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

/usr/bin/mc mb ft-transcendence/${UPLOAD_BUCKET_NAME} --ignore-existing

# Set bucket policy for read and write access
cat > /tmp/bucket-policy.json << EOF
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
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::${UPLOAD_BUCKET_NAME}/*"]
    }
  ]
}
EOF
/usr/bin/mc policy set-json /tmp/bucket-policy.json ft-transcendence/${UPLOAD_BUCKET_NAME}

# Set CORS configuration for web uploads
cat > /tmp/cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"]
    }
  ]
}
EOF
/usr/bin/mc cors set /tmp/cors-config.json ft-transcendence/${UPLOAD_BUCKET_NAME}

/usr/bin/mc anonymous set download ft-transcendence/${UPLOAD_BUCKET_NAME}

echo '===== MinIO initialization completed successfully ====='

mc admin trace -a -v ft-transcendence