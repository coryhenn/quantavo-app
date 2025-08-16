// src/app/api/upload/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only issue signed URLs for the small files (barcodes/features)
const ALLOWED = new Set(["barcodes.tsv.gz", "features.tsv.gz"]);

type SignedOut = { key: string; url: string };

export async function POST(req: NextRequest) {
  const { userId = "demo", filenames } = await req.json();

  if (!Array.isArray(filenames) || filenames.length < 1) {
    return new Response("filenames[] required", { status: 400 });
  }

  // Keep only allowed small-file names
  const wanted = (filenames as string[]).filter((n) => ALLOWED.has(n));
  if (wanted.length === 0) {
    return new Response("no allowed filenames", { status: 400 });
  }

  const basename = (s: string) => s.split("/").pop()!.split("\\").pop()!;
  const out: Record<"barcodes" | "features", SignedOut> = {} as any;

  for (const raw of wanted) {
    const name = basename(raw); // "barcodes.tsv.gz" or "features.tsv.gz"
    const label = name.startsWith("barcodes") ? "barcodes" : "features";
    const key = `${userId}/${crypto.randomUUID()}-${name}`;

    const { data, error } = await supabase
      .storage
      .from("uploads")
      .createSignedUploadUrl(key);

    if (error) {
      console.error("createSignedUploadUrl error:", error);
      return new Response(error.message, { status: 500 });
    }

    out[label as "barcodes" | "features"] = { key, url: data.signedUrl };
  }

  return Response.json({ paths: out });
}
