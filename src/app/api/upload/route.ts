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

  // ensure we only keep the basename and never any folder parts
  const basename = (s: string) => s.split("/").pop()!.split("\\").pop()!;

  const out: { key: string; url: string }[] = [];
  for (const raw of filenames) {
    const name = basename(raw);
    const key = `${userId}/${crypto.randomUUID()}-${name}`;
    const { data, error } = await supabase
      .storage
      .from("uploads")
      .createSignedUploadUrl(key);

    if (error) {
      console.error("createSignedUploadUrl error:", error);
      return new Response(error.message, { status: 500 });
    }
    out.push({ key, url: data.signedUrl });
  }

  // Log for debugging (visible in Vercel logs)
  console.log("signed upload keys:", out.map(o => o.key));
  return Response.json({ paths: out });
}

