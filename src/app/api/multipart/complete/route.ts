import { NextRequest } from "next/server";
import { makeS3 } from "@/lib/s3";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const { key, uploadId, parts } = await req.json();
  // parts = [{ ETag: string, PartNumber: number }]
  if (!key || !uploadId || !Array.isArray(parts))
    return new Response("missing key/uploadId/parts", { status: 400 });

  const s3 = makeS3();
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })) },
  });
  const out = await s3.send(cmd);
  return Response.json({ ok: true, location: out.Location ?? null });
}
