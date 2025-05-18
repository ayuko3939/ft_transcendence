import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { BUCKET_NAME, s3Client } from "@/api/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const fileType = formData.get("fileType") as string;

    if (!fileType) {
      return NextResponse.json(
        { error: "ファイルタイプが提供されていません" },
        { status: 400 },
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(fileType)) {
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

    const minioPublicEndpoint =
      process.env.AWS_ENDPOINT || "http://localhost:9000";
    const publicUrl = `${minioPublicEndpoint}/${BUCKET_NAME}/${objectKey}`;

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl,
      objectKey: objectKey,
      publicUrl: publicUrl,
    });
  } catch (error) {
    console.error("署名付きURL生成エラー:", error);
    return NextResponse.json(
      { error: "署名付きURLの生成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
