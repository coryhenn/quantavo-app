// /app/api/s3/signed-put/route.ts
export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { makeS3 } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const { key, contentType } = await req.json();
  if (!key) return new Response("missing key", { status: 400 });

  const s3 = makeS3();
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 600 });
  return Response.json({ url });
}
