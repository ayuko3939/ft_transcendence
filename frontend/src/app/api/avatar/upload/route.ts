import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { BUCKET_NAME, s3Client } from "@/api/storage";
import { logApiError, logApiRequest } from "@/lib/logger";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      logApiRequest(request.method, request.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const fileType = formData.get("fileType") as string;

    if (!fileType) {
      logApiRequest(
        request.method,
        request.nextUrl.pathname,
        400,
        session.user.id,
      );
      return NextResponse.json(
        { error: "ファイルタイプが提供されていません" },
        { status: 400 },
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(fileType)) {
      logApiRequest(
        request.method,
        request.nextUrl.pathname,
        400,
        session.user.id,
      );
      return NextResponse.json(
        {
          error:
            "無効なファイル形式です。JPEG、PNG、GIF、WEBPのみ許可されています",
        },
        { status: 400 },
      );
    }

    const fileExt = fileType.split("/").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExt}`;
    const objectKey = `users/${session.user.id}/avatars/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // Convert internal MinIO URL to external Nginx proxy URL
    const externalSignedUrl = signedUrl.replace(
      "http://minio:9000",
      `${process.env.AWS_ENDPOINT || "https://localhost/storage"}`
    );

    const minioPublicEndpoint =
      process.env.AWS_ENDPOINT || "https://localhost/storage";
    const publicUrl = `${minioPublicEndpoint}/${BUCKET_NAME}/${objectKey}`;

    logApiRequest(
      request.method,
      request.nextUrl.pathname,
      200,
      session.user.id,
    );
    return NextResponse.json({
      success: true,
      signedUrl: externalSignedUrl,
      objectKey: objectKey,
      publicUrl: publicUrl,
    });
  } catch (error) {
    logApiError(
      request.method,
      request.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("署名付きURL生成エラー:", error);
    return NextResponse.json(
      { error: "署名付きURLの生成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
