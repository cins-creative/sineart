"use client";

import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  syncPhongHocCookiesWithStorage,
} from "@/lib/phong-hoc/classroom-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Phòng học không tạo Supabase Auth — đặt cookie đồng bộ từ localStorage để Server Component bài tập nhận HV/GV.
 * Lắng nghe đổi `sine_art_session` (đăng nhập user khác trong cùng tab) để cập nhật cookie + `router.refresh()`.
 */
export default function HvSessionFromClassroomSync() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      void syncPhongHocCookiesWithStorage().then(() => {
        router.refresh();
      });
    };
    run();
    window.addEventListener(CLASSROOM_SESSION_CHANGED_EVENT, run);
    return () => window.removeEventListener(CLASSROOM_SESSION_CHANGED_EVENT, run);
  }, [router]);

  return null;
}
