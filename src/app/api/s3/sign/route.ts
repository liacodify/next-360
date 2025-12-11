import { s3 } from "@/lib/aws-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get("fileName");
  const fileType =
    url.searchParams.get("fileType") || "application/octet-stream"; // valor por defecto

  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
  }

  try {
    const { url: uploadUrl, fields } = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: `${Date.now()}-${fileName}`,
      Expires: 60,
      Fields: {
        "Content-Type": fileType,
        // "acl": "public-read", // opcional si quieres que sea público
      },
      Conditions: [
        ["eq", "$Content-Type", fileType], // asegura que el content-type sea obligatorio
      ],
    });

    return NextResponse.json({ uploadUrl, fields });
  } catch (error) {
    console.error("S3 signing error:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 },
    );
  }
}
