import { NextRequest } from "next/server";
import { makeS3 } from "@/lib/s3";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const { key, contentType } = await req.json();
  if (!key) return new Response("missing key", { status: 400 });

  const s3 = makeS3();
  const cmd = new CreateMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const out = await s3.send(cmd);
  if (!out.UploadId) return new Response("no uploadId", { status: 500 });
  return Response.json({ uploadId: out.UploadId });
}
