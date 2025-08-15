// src/app/api/status/route.ts
import { NextRequest } from "next/server";
import { getRun, upsertRun, type RunStatus } from "@/lib/runStore";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });

  const run = getRun(id);
  if (!run) return new Response("not found", { status: 404 });

  const elapsed = (Date.now() - run.createdAt) / 1000;

  // Time-based demo state machine
  let nextStatus: RunStatus = "RUNNING";
  let message = "Loading…";
  if (elapsed > 3 && elapsed <= 6) {
    message = "Computing PCA / UMAP…";
  } else if (elapsed > 6) {
    nextStatus = "SUCCEEDED";
    message = "Done.";
  }

  upsertRun(id, {
    status: nextStatus,
    message,
    umapPngPath: nextStatus === "SUCCEEDED" ? "/next.svg" : null,
    markersCsv: nextStatus === "SUCCEEDED" ? "/example-markers.csv" : null,
    reportPdfPath: nextStatus === "SUCCEEDED" ? "/example-report.pdf" : null,
  });

  return Response.json(getRun(id)!);
}
