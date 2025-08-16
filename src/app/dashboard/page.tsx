"use client";

"use client";

import { useState } from "react";
import { uploadLargeFile } from "@/lib/multipartClient";

type SignedUpload = { key: string; url: string };
type SmallPaths = { barcodes: SignedUpload; features: SignedUpload };

export default function DashboardPage() {
  const [barcodes, setBarcodes] = useState<File | null>(null);
  const [features, setFeatures] = useState<File | null>(null);
  const [matrix, setMatrix] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedKeys, setUploadedKeys] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // optional

  async function uploadFiles() {
    if (!barcodes || !features || !matrix) {
      setError("Please choose all three files");
      return;
    }
    setError(null);
    setIsUploading(true);
    setUploadedKeys(null);
    setProgress(0);

    // 1) Create a stable key for the BIG file
    const matrixKey = `demo/${crypto.randomUUID()}-${matrix.name}`;

    try {
      // 2) Upload BIG file via multipart (8 MB parts avoids 413)
      await uploadLargeFile({
        file: matrix,
        key: matrixKey,
        partSize: 8 * 1024 * 1024, // 8 MB
        concurrency: 4,
        onProgress: (up, total) => setProgress(Math.floor((up / total) * 100)),
      });

      // 3) Ask server for signed URLs for the two small files
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo",
          filenames: ["barcodes.tsv.gz", "features.tsv.gz"],
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to get signed upload URLs: ${await res.text()}`);
      }
      const { paths } = (await res.json()) as { paths: SmallPaths };

      // 4) PUT the two small files
      const put = async (label: string, url: string, file: File) => {
        const resp = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/octet-stream" },
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(`${label} upload failed (${resp.status}): ${txt || "no body"}`);
        }
      };

      await put("barcodes.tsv.gz", paths.barcodes.url, barcodes);
      await put("features.tsv.gz", paths.features.url, features);

      // 5) Record keys for all three uploads
      setUploadedKeys([paths.barcodes.key, paths.features.key, matrixKey]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Upload 10x Files</h1>
      <p className="text-gray-600">
        Choose <code>barcodes.tsv.gz</code>, <code>features.tsv.gz</code>, and{" "}
        <code>matrix.mtx.gz</code>.
      </p>

      <div className="space-y-3">
        <input type="file" accept=".gz" onChange={(e) => setBarcodes(e.target.files?.[0] ?? null)} />
        <input type="file" accept=".gz" onChange={(e) => setFeatures(e.target.files?.[0] ?? null)} />
        <input type="file" accept=".gz" onChange={(e) => setMatrix(e.target.files?.[0] ?? null)} />
      </div>

      <button
        onClick={uploadFiles}
        disabled={!barcodes || !features || !matrix || isUploading}
        className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
      >
        {isUploading ? "Uploading…" : "Upload to Supabase"}
      </button>

      {isUploading && (
        <div className="text-sm text-gray-500">Matrix upload: {progress}%</div>
      )}

      {error && <div className="text-red-600">{error}</div>}

      {uploadedKeys && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Uploaded objects:</div>
          <ul className="list-disc pl-6">
            {uploadedKeys.map((k) => (
              <li key={k}><code>{k}</code></li>
            ))}
          </ul>
          <p className="text-sm text-gray-500 mt-2">
            Verify in Supabase → Storage → <b>uploads</b>.
          </p>
        </div>
      )}
    </main>
  );
}


