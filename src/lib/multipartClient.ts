type CompletedPart = { ETag: string; PartNumber: number };

export async function uploadLargeFile({
  file,
  key,          // e.g. `demo/${cryptoUUID()}-matrix.mtx.gz`
  partSize = 64 * 1024 * 1024, // 64MB
  concurrency = 4,
  onProgress,
}: {
  file: File;
  key: string;
  partSize?: number;
  concurrency?: number;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}) {
  // 1) Initiate (or resume)
  const stashKey = `mpu:${key}:${file.size}`;
  let { uploadId, parts }: { uploadId: string; parts: CompletedPart[] } =
    JSON.parse(localStorage.getItem(stashKey) || `{"uploadId":"","parts":[]}`);

  if (!uploadId) {
    const init = await fetch("/api/multipart/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, contentType: file.type || "application/gzip" }),
    }).then(r => r.json());
    uploadId = init.uploadId;
    parts = [];
    localStorage.setItem(stashKey, JSON.stringify({ uploadId, parts }));
  }

  const total = file.size;
  let uploaded = parts.reduce((sum, p) => sum + partSize, 0);
  onProgress?.(uploaded, total);

  // 2) Create upload tasks for missing parts
  const totalParts = Math.ceil(file.size / partSize);
  const missing: number[] = [];
  const have = new Set(parts.map(p => p.PartNumber));
  for (let i = 1; i <= totalParts; i++) if (!have.has(i)) missing.push(i);

  async function uploadPart(partNumber: number) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);

    const sign = await fetch("/api/multipart/sign-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, partNumber }),
    }).then(r => r.json());

    // PUT blob to presigned URL
    const resp = await fetch(sign.url, {
      method: "PUT",
      body: blob,
      // don't set Content-Type; let the URL’s signature govern it
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Part ${partNumber} failed (${resp.status}): ${txt || "no body"}`);
    }

    const etag = resp.headers.get("ETag") || resp.headers.get("etag");
    if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);

    parts.push({ ETag: etag.replaceAll('"', ""), PartNumber: partNumber });
    localStorage.setItem(stashKey, JSON.stringify({ uploadId, parts }));
    uploaded += blob.size;
    onProgress?.(uploaded, total);
  }

  // 3) Run with limited concurrency + simple retries
  const queue = [...missing];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const n = queue.shift()!;
      try {
        await uploadPart(n);
      } catch (e) {
        // basic retry once
        try { await uploadPart(n); }
        catch (err) { throw err; }
      }
    }
  });

  await Promise.all(workers);

  // 4) Complete
  parts.sort((a, b) => a.PartNumber - b.PartNumber);
  await fetch("/api/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, uploadId, parts }),
  }).then(r => r.json());

  // 5) Cleanup resume state
  localStorage.removeItem(stashKey);
}
