import { NextRequest } from "next/server";
import { getRunsStore } from "../run/route";

// Simple elapsed-time state machine:
// 0-3s: RUNNING, 3-6s: RUNNING (different message), >6s: SUCCEEDED
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });

  const runs = getRunsStore();
  const run = runs.get(id);
  if (!run) return new Response("not found", { status: 404 });

  const elapsed = (Date.now() - run.createdAt) / 1000;

  let status = "RUNNING";
  let message = "Loading…";
  if (elapsed > 3 && elapsed <= 6) message = "Computing PCA / UMAP…";
  if (elapsed > 6) {
    status = "SUCCEEDED";
    message = "Done.";
  }

  const result = {
    id,
    status,
    message,
    // Placeholder “artifacts” – replace with real URLs later
    umapPngPath: status === "SUCCEEDED" ? "/next.svg" : null,
    markersCsv: status === "SUCCEEDED" ? "/example-markers.csv" : null,
    reportPdfPath: status === "SUCCEEDED" ? "/example-report.pdf" : null,
  };

  return Response.json(result);
}
