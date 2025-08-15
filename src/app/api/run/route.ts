// src/app/api/run/route.ts
import { createRun } from "@/lib/runStore";

export async function POST() {
  const run = createRun();          // later we’ll read inputs from req.json()
  return Response.json({ id: run.id });
}
