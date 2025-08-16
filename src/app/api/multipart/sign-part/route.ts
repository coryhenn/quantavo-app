import { NextRequest } from "next/server";
import { makeS3 } from "@/lib/s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// at the top of each of these files:
export const runtime = "nodejs";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const { key, uploadId, partNumber } = await req.json();
  if (!key || !uploadId || !partNumber)
    return new Response("missing key/uploadId/partNumber", { status: 400 });

  const s3 = makeS3();
  const cmd = new UploadPartCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10 minutes
  return Response.json({ url });
}
