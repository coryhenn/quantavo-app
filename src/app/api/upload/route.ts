// src/app/api/upload/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId = "demo", filenames } = await req.json();
  if (!Array.isArray(filenames) || filenames.length !== 3) {
    return new Response("expected 3 filenames", { status: 400 });
  }

  const basename = (s: string) => s.split("/").pop()!.split("\\").pop()!;
  const labels = ["barcodes", "features", "matrix"] as const;

  const out: Record<(typeof labels)[number], { key: string; url: string }> = {
    barcodes: { key: "", url: "" },
    features: { key: "", url: "" },
    matrix:   { key: "", url: "" },
  };

  for (let i = 0; i < labels.length; i++) {
    const name = basename(filenames[i]);
    const key = `${userId}/${crypto.randomUUID()}-${name}`;
    const { data, error } = await supabase
      .storage.from("uploads")
      .createSignedUploadUrl(key);

    if (error) {
      console.error("createSignedUploadUrl error:", error);
      return new Response(error.message, { status: 500 });
    }
    out[labels[i]] = { key, url: data.signedUrl };
  }

  console.log("signed upload keys:", Object.values(out).map(o => o.key));
  return Response.json({ paths: out }); // { barcodes:{key,url}, features:{...}, matrix:{...} }
}


