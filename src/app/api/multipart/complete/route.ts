// Node runtime (important when using service creds + aws sdk)
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { makeS3 } from "@/lib/s3";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const { key, uploadId, parts } = await req.json();
  if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return new Response("missing key/uploadId/parts", { status: 400 });
  }

  const s3 = makeS3();

  // Parts must be sorted and have ETag + PartNumber
  const completed = (parts as CompletedPart[]).slice().sort((a, b) => {
    return Number(a.PartNumber) - Number(b.PartNumber);
  });

  try {
    const out = await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completed },
      })
    );
    return Response.json({ ok: true, location: out.Location, key });
  } catch (err) {
    // Best-effort cleanup so you don’t strand MPU state
    await s3.send(
      new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId })
    ).catch(() => {});
    console.error("complete-mpu error:", err);
    return new Response("complete failed", { status: 500 });
  }
}

