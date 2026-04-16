"use client";

import {
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
} from "@/lib/phong-hoc/classroom-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Phòng học không tạo Supabase Auth — đặt cookie đồng bộ từ localStorage để Server Component bài tập nhận HV.
 * Gọi `router.refresh()` sau khi cookie được set để không còn gate «Đăng nhập» trên lần render kế tiếp.
 */
export default function HvSessionFromClassroomSync() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY);
      const s = parseClassroomSession(raw);
      if (s?.userType !== "Student") return;
      const qlhv_id = s.data.qlhv_id;
      const lop_hoc_id = s.data.lop_hoc_id;
      if (!Number.isFinite(qlhv_id) || !Number.isFinite(lop_hoc_id)) return;

      void (async () => {
        const res = await fetch("/api/phong-hoc/sync-hv-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qlhv_id, lop_hoc_id }),
          credentials: "include",
        });
        if (res.ok) router.refresh();
      })();
    } catch {
      /* ignore */
    }
  }, [router]);

  return null;
}
