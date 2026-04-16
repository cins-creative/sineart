/** POST multipart `file` → `/admin/api/upload-cf-image` (cookie admin). */
export async function uploadAdminCfImage(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/admin/api/upload-cf-image", { method: "POST", body: fd, credentials: "same-origin" });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok || typeof json !== "object" || json === null || (json as { ok?: unknown }).ok !== true) {
    const err =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error)
        : "Tải ảnh thất bại.";
    throw new Error(err);
  }
  const url = (json as { url?: unknown }).url;
  if (typeof url !== "string" || !url.trim()) throw new Error("Không nhận được link ảnh.");
  return url.trim();
}
