import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Trả thời gian server để client tính offset (brief: clock skew).
 * Ưu tiên RPC `server_now_thi_thu` nếu có trên DB; không thì dùng thời gian route handler.
 */
export async function GET(): Promise<NextResponse> {
  const tLocal = Date.now();
  const supabase = await createClient();
  if (supabase) {
    const rpc = await supabase.rpc("server_now_thi_thu");
    if (!rpc.error && rpc.data != null) {
      const raw = rpc.data as string | number | Date;
      const serverMs =
        typeof raw === "number"
          ? raw
          : raw instanceof Date
            ? raw.getTime()
            : Date.parse(String(raw));
      if (Number.isFinite(serverMs)) {
        return NextResponse.json({
          serverMs,
          offsetMs: serverMs - tLocal,
          source: "rpc",
        });
      }
    }
  }
  return NextResponse.json({ serverMs: tLocal, offsetMs: 0, source: "route" });
}
