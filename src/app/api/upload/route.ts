import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId = "demo", filenames } = await req.json();
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return new Response("missing filenames", { status: 400 });
  }

  const out: { key: string; url: string }[] = [];
  for (const name of filenames) {
    const key = `${userId}/${crypto.randomUUID()}-${name}`;
    const { data, error } =
      await supabase.storage.from("uploads").createSignedUploadUrl(key);
    if (error) return new Response(error.message, { status: 500 });
    out.push({ key, url: data.signedUrl });
  }

  return Response.json({ paths: out }); // [{key,url}, ...]
}
