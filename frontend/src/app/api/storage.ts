import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "rootuser",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "changeme123",
  },
  forcePathStyle: true, // MinIO Original Setting
});

export const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || "default-bucket";
