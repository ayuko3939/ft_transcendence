import { S3Client } from "@aws-sdk/client-s3";

// Internal client for signature generation (direct MinIO access)
export const s3ClientInternal = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: "http://minio:9000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "rootuser",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "changeme123",
  },
  forcePathStyle: true,
});

// External client for public URLs (through Nginx proxy)
export const s3Client = s3ClientInternal;

export const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || "default-bucket";
