type CompletedPart = { ETag: string; PartNumber: number };

export async function uploadLargeFile({
  file,
  key,
  partSize = 64 * 1024 * 1024,
  concurrency = 4,
  onProgress,
}: {
  file: File;
  key: string;
  partSize?: number;
  concurrency?: number;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}) {
  const stashKey = `mpu:${key}:${file.size}`;
  let { uploadId, parts }: { uploadId: string; parts: CompletedPart[] } =
    JSON.parse(localStorage.getItem(stashKey) || `{"uploadId":"","parts":[]}`);

  if (!uploadId) {
    const initRes = await fetch("/api/multipart/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, contentType: file.type || "application/gzip" }),
    });
    if (!initRes.ok) throw new Error(`initiate failed: ${await initRes.text()}`);
    const init = await initRes.json();
    uploadId = init.uploadId;
    parts = [];
    localStorage.setItem(stashKey, JSON.stringify({ uploadId, parts }));
  }

  const total = file.size;
  const partLength = (n: number) =>
    Math.min(partSize, total - (n - 1) * partSize);

  let uploaded = parts
    .map(p => partLength(p.PartNumber))
    .reduce((a, b) => a + b, 0);
  onProgress?.(uploaded, total);

  const totalParts = Math.ceil(file.size / partSize);
  const have = new Set(parts.map(p => p.PartNumber));
  const missing: number[] = [];
  for (let i = 1; i <= totalParts; i++) if (!have.has(i)) missing.push(i);

  async function uploadPart(partNumber: number) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);

    const signRes = await fetch("/api/multipart/sign-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, partNumber }),
    });
    if (!signRes.ok) throw new Error(`sign-part failed: ${await signRes.text()}`);
    const sign = await signRes.json();

    const resp = await fetch(sign.url, { method: "PUT", body: blob });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Part ${partNumber} failed (${resp.status}): ${txt || "no body"}`);
    }

    const cleanETag = (resp.headers.get("ETag") || resp.headers.get("etag") || "")
      .replaceAll('"', "");
    if (!cleanETag) throw new Error(`Missing ETag for part ${partNumber}`);

    const idx = parts.findIndex(p => p.PartNumber === partNumber);
    const entry = { ETag: cleanETag, PartNumber: partNumber };
    if (idx >= 0) parts[idx] = entry; else parts.push(entry);

    localStorage.setItem(stashKey, JSON.stringify({ uploadId, parts }));
    uploaded += blob.size;
    onProgress?.(uploaded, total);
  }

  const queue = [...missing];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const n = queue.shift()!;
      try {
        await uploadPart(n);
      } catch (_e) {
        try { await uploadPart(n); } catch (err) { throw err; }
      }
    }
  });
  await Promise.all(workers);

  parts.sort((a, b) => a.PartNumber - b.PartNumber);

  const completeRes = await fetch("/api/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error(`complete failed: ${await completeRes.text()}`);
  await completeRes.json();

  localStorage.removeItem(stashKey);
}

