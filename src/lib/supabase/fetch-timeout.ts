/**
 * Fetch kèm timeout — tránh `next build` / SSG treo hàng phút khi Supabase
 * (Cloudflare 522, mạng chậm) không phản hồi.
 *
 * Gắn vào `global.fetch` của Supabase client (`@supabase/supabase-js`).
 */
const DEFAULT_TIMEOUT_MS = 20_000;

export function createFetchWithTimeout(timeoutMs = DEFAULT_TIMEOUT_MS): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const upstream = init?.signal;
    const onUpstreamAbort = () => controller.abort();
    if (upstream) {
      if (upstream.aborted) {
        clearTimeout(timer);
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      }
      upstream.addEventListener("abort", onUpstreamAbort, { once: true });
    }

    return fetch(input, { ...init, signal: controller.signal })
      .finally(() => {
        clearTimeout(timer);
        upstream?.removeEventListener("abort", onUpstreamAbort);
      });
  };
}
