"use client";

import { useEffect, useState } from "react";

type RunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export default function DashboardPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<{ umapPngPath?: string | null; markersCsv?: string | null; reportPdfPath?: string | null; } | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function startFakeRun() {
    setIsStarting(true);
    setStatus(null);
    setArtifacts(null);
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const j = await res.json();
      setRunId(j.id);
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    if (!runId) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/status?id=${runId}`);
      if (!r.ok) return;
      const j = await r.json();
      setStatus(j.status);
      setMessage(j.message);
      setArtifacts({ umapPngPath: j.umapPngPath, markersCsv: j.markersCsv, reportPdfPath: j.reportPdfPath });
      if (j.status === "SUCCEEDED" || j.status === "FAILED") clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [runId]);

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-500">Click “Start Run” to simulate a cloud job and poll for status.</p>

      <button
        onClick={startFakeRun}
        disabled={isStarting}
        className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
      >
        {isStarting ? "Starting…" : "Start Run"}
      </button>

      {runId && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm text-gray-500">Run ID: {runId}</div>
          <div className="font-medium">Status: {status ?? "…"}</div>
          {message && <div className="text-gray-600">{message}</div>}

          {artifacts?.umapPngPath && (
            <div className="pt-2">
              <div className="text-sm text-gray-500 mb-2">UMAP (placeholder):</div>
              {/* Using /next.svg as placeholder image for now */}
              <img src={artifacts.umapPngPath} alt="UMAP" className="border rounded-lg max-w-full" />
            </div>
          )}

          <div className="flex gap-4 pt-2">
            {artifacts?.markersCsv && (
              <a className="underline" href={artifacts.markersCsv}>Download markers CSV</a>
            )}
            {artifacts?.reportPdfPath && (
              <a className="underline" href={artifacts.reportPdfPath}>Download PDF</a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
