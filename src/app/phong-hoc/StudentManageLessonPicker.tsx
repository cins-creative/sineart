"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ExerciseItem, StudentManageRow } from "@/lib/phong-hoc/student-manage-data";
import {
  patchEnrollmentProgress,
  resolveExerciseSubjectKey,
} from "@/lib/phong-hoc/student-manage-data";

const DS = {
  font: "var(--font-geist-sans), 'Be Vietnam Pro', system-ui, sans-serif",
  gradTeacher: "linear-gradient(135deg, #BC8AF9, #ED5C9D)",
  colorTeacher: "#BC8AF9",
  colorText: "#323232",
  colorSub: "#888888",
  colorMuted: "#AAAAAA",
  colorBorder: "#EAEAEA",
  colorSurface: "#F5F7F7",
  colorBg: "#FFFFFF",
};

const COLORS = [
  "#ff5f72",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];
const cc: Record<string, string> = {};
let ci = 0;
function getColor(n: string) {
  return cc[n] || (cc[n] = COLORS[ci++ % COLORS.length]);
}

type Props = {
  student: StudentManageRow;
  exBySubject: Record<string, ExerciseItem[]>;
  allSubjects: string[];
  /** Từ `ql_lop_hoc` → `ql_mon_hoc.ten_mon_hoc` — chỉ chọn bài theo môn của lớp. */
  lopTenMonHoc: string | null;
  /** Chỉ dùng khi không đọc được môn lớp (gợi ý khớp tên môn). */
  filterSubjectFallback: string;
  /** `ql_lop_hoc.id` hiện tại — API server dùng để verify ghi danh + quyền GV. */
  lopHocId: number;
  /** `hr_nhan_su.id` của GV đang đăng nhập — API verify `ql_lop_hoc.teacher`. */
  teacherHrId: number;
  onSave: (newIds: number[]) => void;
  onBack: () => void;
};

export default function StudentManageLessonPicker({
  student,
  exBySubject,
  allSubjects,
  lopTenMonHoc,
  filterSubjectFallback,
  lopHocId,
  teacherHrId,
  onSave,
  onBack,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(student.tienDoId != null ? [student.tienDoId] : [])
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Môn của lớp (`ql_lop_hoc` → `mon_hoc`), khớp với key trong `exBySubject`.
   * Không lấy từ tiến độ HV — lớp Trang trí màu chỉ thấy bài Trang trí màu.
   */
  const monKeyResolved = useMemo(() => {
    const fromLop = resolveExerciseSubjectKey(lopTenMonHoc, exBySubject, allSubjects);
    if (fromLop) return { key: fromLop, source: "lop" as const };
    const fs = filterSubjectFallback.trim();
    if (fs) {
      const fromHint = resolveExerciseSubjectKey(fs, exBySubject, allSubjects);
      if (fromHint) return { key: fromHint, source: "hint" as const };
    }
    return { key: null as string | null, source: null as "lop" | "hint" | null };
  }, [lopTenMonHoc, filterSubjectFallback, exBySubject, allSubjects]);

  const monDangHoc = monKeyResolved.key;

  const visSub = useMemo(() => {
    if (!monDangHoc) return [] as string[];
    if ((exBySubject[monDangHoc]?.length ?? 0) > 0) return [monDangHoc];
    return [] as string[];
  }, [monDangHoc, exBySubject]);

  const toggle = (id: number) => {
    setSelected((p) => (p.has(id) ? new Set<number>() : new Set<number>([id])));
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const baiTapId = selected.size > 0 ? [...selected][0]! : null;
      await patchEnrollmentProgress({
        lopHocId,
        enrollmentId: student.enrollmentId,
        teacherHrId,
        baiTapId,
      });
      onSave(baiTapId != null ? [baiTapId] : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  const selectedEx =
    selected.size > 0
      ? Object.values(exBySubject)
          .flat()
          .find((e) => selected.has(e.id))
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: DS.font }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 22px",
          borderBottom: `1px solid ${DS.colorSurface}`,
          flexShrink: 0,
        }}
      >
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: `1px solid ${DS.colorBorder}`,
            background: DS.colorSurface,
            cursor: "pointer",
            color: DS.colorSub,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: DS.colorTeacher,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 2,
            }}
          >
            Cập nhật tiến độ
          </p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {student.name}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 10,
            border: "none",
            background: saving ? "#ccc" : DS.gradTeacher,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            flexShrink: 0,
          }}
        >
          ✓ {saving ? "Đang lưu…" : "Lưu"}
        </motion.button>
      </div>
      {err ? (
        <p style={{ fontSize: 12, color: "#ee5b9f", padding: "6px 22px 0", flexShrink: 0 }}>{err}</p>
      ) : null}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 24px", minHeight: 0 }}>
        {visSub.length === 0 ? (
          <p style={{ fontSize: 13, color: DS.colorMuted, lineHeight: 1.5, margin: 0 }}>
            {lopTenMonHoc && !monDangHoc
              ? `Không tìm thấy bài tập khớp môn lớp «${lopTenMonHoc}» trong hệ thống (kiểm tra tên môn ở bài tập và ở lớp).`
              : monDangHoc
                ? `Chưa có bài tập nào trong môn «${monDangHoc}».`
                : lopTenMonHoc === null && monKeyResolved.source === null
                  ? "Không đọc được môn của lớp. Thử làm mới hoặc kiểm tra quyền truy cập dữ liệu lớp."
                  : "Không có bài tập để chọn cho môn này."}
          </p>
        ) : null}
        {visSub.map((mon) => {
          const color = getColor(mon);
          return (
            <div key={mon} style={{ marginBottom: 24 }}>
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                {mon}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {(exBySubject[mon] || []).map((ex) => {
                  const on = selected.has(ex.id);
                  return (
                    <button
                      type="button"
                      key={ex.id}
                      onClick={() => toggle(ex.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: 0,
                        borderRadius: 10,
                        cursor: "pointer",
                        overflow: "hidden",
                        textAlign: "left",
                        transition: "all .15s",
                        background: on ? `${color}12` : "#fafafa",
                        border: `1.5px solid ${on ? color : "#e9ecef"}`,
                        boxShadow: on ? `0 0 0 2px ${color}25` : "none",
                      }}
                    >
                      {ex.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ex.thumb}
                          alt=""
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16/9",
                            background: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            color: "#94a3b8",
                            fontWeight: 700,
                          }}
                        >
                          {ex.so}
                        </div>
                      )}
                      <div
                        style={{
                          padding: "8px 10px 10px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 6,
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: on ? color : "#94a3b8", marginBottom: 2 }}>
                            Bài {ex.so}
                          </p>
                          <p style={{ fontSize: 11, color: on ? "#2d2020" : "rgba(45, 32, 32, 0.56)", lineHeight: 1.35 }}>{ex.tenBai}</p>
                        </div>
                        {on ? (
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: color,
                              color: "white",
                              fontSize: 10,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            ✓
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedEx ? (
        <div style={{ padding: "10px 22px", borderTop: `1px solid ${DS.colorSurface}`, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: DS.colorMuted }}>
            Đã chọn: Bài {selectedEx.so} — {selectedEx.tenBai}
          </span>
        </div>
      ) : null}
    </div>
  );
}
