// Minimal in-memory runs store (ok for MVP)
type RunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

type Run = {
  id: string;
  status: RunStatus;
  createdAt: number; // ms
  message?: string;
};

// NOTE: this module-level Map resets on cold starts (fine for demo)
const RUNS = new Map<string, Run>();

export async function POST(req: Request) {
  // In the real version you’ll read file keys/params from req.json()
  // const { userId, barcodesPath, featuresPath, matrixPath, params } = await req.json();

  const id = crypto.randomUUID();
  const now = Date.now();

  RUNS.set(id, { id, status: "RUNNING", createdAt: now, message: "Processing…" });

  // We don't run timers on the serverless side; status will be derived from elapsed time
  return Response.json({ id });
}

// Export helper for the status route (same module instance in a single region)
export function getRunsStore() {
  return RUNS;
}
