import { S3Client } from "@aws-sdk/client-s3";

// If you have NEXT_PUBLIC_SUPABASE_URL, derive the endpoint from it so you
// don’t hardcode the ref:
function endpointFromEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // e.g. https://<ref>.supabase.co
  const u = new URL(url);
  return `https://${u.host}/storage/v1/s3`;
}

export function makeS3() {
  return new S3Client({
    region: process.env.SUPABASE_S3_REGION || "us-east-1",
    endpoint: endpointFromEnv(),
    forcePathStyle: true, // required for Supabase S3 gateway
    credentials: {
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
    },
  });
}

