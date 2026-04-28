/** Cùng worker `sine-art-api` — ưu tiên `NEXT_PUBLIC_AGENT_WORKER_URL` nếu set. */
export function getAgentWorkerBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_AGENT_WORKER_URL?.trim();
  return u ? u.replace(/\/$/, "") : "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";
}
