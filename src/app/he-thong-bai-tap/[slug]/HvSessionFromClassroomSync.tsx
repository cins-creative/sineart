"use client";

import {
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
} from "@/lib/phong-hoc/classroom-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Phòng học không tạo Supabase Auth — đặt cookie đồng bộ từ localStorage để Server Component bài tập nhận HV/GV.
 * Gọi `router.refresh()` sau khi cookie được set để không còn gate «Đăng nhập» / «Bài chưa mở» trên lần render kế tiếp.
 */
export default function HvSessionFromClassroomSync() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY);
      const s = parseClassroomSession(raw);
      if (!s) return;

      if (s.userType === "Student") {
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
        return;
      }

      if (s.userType === "Teacher") {
        const hr_id = s.data.id;
        const lop_hoc_id = s.data.lop_hoc_id;
        if (!Number.isFinite(hr_id) || !Number.isFinite(lop_hoc_id)) return;

        void (async () => {
          const res = await fetch("/api/phong-hoc/sync-gv-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hr_id, lop_hoc_id }),
            credentials: "include",
          });
          if (res.ok) router.refresh();
        })();
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  return null;
}
