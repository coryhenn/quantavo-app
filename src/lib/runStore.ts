// src/lib/runStore.ts
export type RunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type Run = {
  id: string;
  status: RunStatus;
  createdAt: number;
  message?: string;
  umapPngPath?: string | null;
  markersCsv?: string | null;
  reportPdfPath?: string | null;
  resultJson?: unknown;
};

const RUNS = new Map<string, Run>();

export function createRun(): Run {
  const id = crypto.randomUUID();
  const run: Run = {
    id,
    status: "RUNNING",
    createdAt: Date.now(),
    message: "Processing…",
  };
  RUNS.set(id, run);
  return run;
}

export function getRun(id: string): Run | undefined {
  return RUNS.get(id);
}

export function upsertRun(id: string, patch: Partial<Run>): Run | undefined {
  const prev = RUNS.get(id);
  if (!prev) return undefined;
  const next: Run = { ...prev, ...patch };
  RUNS.set(id, next);
  return next;
}


