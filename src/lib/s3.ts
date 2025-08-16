import { S3Client } from "@aws-sdk/client-s3";

export function makeS3() {
  const ref = process.env.SUPABASE_PROJECT_REF!;
  const region = process.env.SUPABASE_S3_REGION || "us-east-1";
  return new S3Client({
    region,
    endpoint: `https://${ref}.supabase.co/storage/v1/s3`,
    forcePathStyle: true, // required for Supabase S3 gateway
    credentials: {
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
    },
  });
}
