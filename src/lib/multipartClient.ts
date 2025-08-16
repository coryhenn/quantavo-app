type CompletedPart = { ETag: string; PartNumber: number };

function choosePartSize(totalBytes: number) {
  // Keep parts between 8 MiB and 128 MiB and under 9,500 parts
  const min = 8 * 1024 * 1024;
  const max = 128 * 1024 * 1024;
  // Target ~6,000–8,000 parts worst-case for giant files
  let size = Math.ceil(totalBytes / 8000);
  size = Math.max(size, min);
  size = Math.min(size, max);
  // S3 requires >= 5 MiB (we're already above)
  return size;
}

export async function uploadLargeFile({
  file,
  key,
  partSize,
  concurrency = 4,
  onProgress,
}: {
  file: File;
  key: string;
  partSize?: number;
  concurrency?: number;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}) {
  const autoSize = partSize ?? choosePartSize(file.size);

  const stashKey = `mpu:${key}:${file.size}:${autoSize}`;
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
  const partLength = (n: number) => Math.min(autoSize, total - (n - 1) * autoSize);

  let uploaded = parts.map(p => partLength(p.PartNumber)).reduce((a, b) => a + b, 0);
  onProgress?.(uploaded, total);

  const totalParts = Math.ceil(file.size / autoSize);
  const have = new Set(parts.map(p => p.PartNumber));
  const missing: number[] = [];
  for (let i = 1; i <= totalParts; i++) if (!have.has(i)) missing.push(i);

  async function uploadPart(partNumber: number) {
    const start = (partNumber - 1) * autoSize;
    const end = Math.min(start + autoSize, file.size);
    const blob = file.slice(start, end);

    const signRes = await fetch("/api/multipart/sign-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, partNumber }),
    });
    if (!signRes.ok) throw new Error(`sign-part failed: ${await signRes.text()}`);
    const sign = await signRes.json();

    // Upload the part
    const resp = await fetch(sign.url, {
      method: "PUT",
      body: blob,
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      // If we see 413/400, surface a hint for the UI
      throw new Error(`Part ${partNumber} failed (${resp.status}): ${txt || "no body"}`);
    }

    // Some gateways return lowercase header
    const etagHeader = resp.headers.get("ETag") || resp.headers.get("etag") || "";
    const cleanETag = etagHeader.replaceAll('"', "");
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
      } catch (err) {
        // One retry is fine; beyond that, bubble up
        try { await uploadPart(n); } catch (err2) { throw err2; }
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


