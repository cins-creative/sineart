"use client";

import { vnCalendarDateString } from "@/lib/phong-hoc/diem-danh";
import type { PhDiemDanhNgayRow } from "@/lib/phong-hoc/diem-danh";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { fetchTruongNganhLabelsForHv } from "@/lib/phong-hoc/lookup-by-email";
import {
  buildExerciseModel,
  fetchExercisesForManage,
  fetchStudentsForClassManage,
  fetchTenMonHocForLop,
  type ExerciseItem,
  type StudentManageRow,
} from "@/lib/phong-hoc/student-manage-data";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import StudentManageLessonPicker from "./StudentManageLessonPicker";

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

const s2l = (v: string) => v.toLowerCase();

const TINH_TRANG_ORDER: Record<string, number> = {
  "Đang học": 0,
  "Bảo lưu": 1,
  "Hoàn thành": 2,
  "Nghỉ học": 3,
};

const TINH_TRANG_COLOR: Record<string, { bg: string; text: string }> = {
  "Đang học": { bg: "rgba(110, 254, 192, 0.35)", text: "#2d2020" },
  "Bảo lưu": { bg: "rgba(253, 232, 89, 0.42)", text: "#2d2020" },
  "Hoàn thành": { bg: "rgba(187, 137, 248, 0.22)", text: "#2d2020" },
  "Nghỉ học": { bg: "rgba(238, 91, 159, 0.2)", text: "#2d2020" },
};

function Ring({
  subject,
  order,
  total,
}: {
  subject: string;
  order: number;
  total: number;
}) {
  const c = getColor(subject);
  const n = order || 0;
  const pct = total > 0 ? Math.min(n / total, 1) : 0;
  const R = 13;
  const sw = 2.5;
  const size = 32;
  const circ = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}
      >
        <circle cx={16} cy={16} r={R} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
        <circle
          cx={16}
          cy={16}
          r={R}
          fill="none"
          stroke={n > 0 ? c : "#e5e7eb"}
          strokeWidth={sw}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .5s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 8, fontWeight: 700, color: n > 0 ? c : "#d1d5db", lineHeight: 1 }}>
          {n > 0 ? n : "—"}
        </span>
        {n > 0 ? (
          <span style={{ fontSize: 6, color: `${c}99`, lineHeight: 1 }}>/{total}</span>
        ) : null}
      </div>
    </div>
  );
}

function TinhTrangBadge({ value }: { value: string }) {
  const cfg = TINH_TRANG_COLOR[value] || { bg: "rgba(187, 137, 248, 0.1)", text: "#2d2020" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.text,
        fontFamily: DS.font,
        whiteSpace: "nowrap",
      }}
    >
      {value || "—"}
    </span>
  );
}

function ProgressCard({
  mon,
  latest,
  total,
  onClick,
}: {
  mon: string;
  latest: ExerciseItem | null;
  total: number;
  onClick: () => void;
}) {
  const c = getColor(mon);
  const [hov, setHov] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 8px 5px 6px",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all .15s",
        border: `1px solid ${latest ? (hov ? c : `${c}55`) : DS.colorBorder}`,
        background: latest
          ? hov
            ? `${c}16`
            : `${c}08`
          : hov
            ? "#f8fafc"
            : DS.colorSurface,
      }}
    >
      <Ring subject={mon} order={latest?.order ?? 0} total={total} />
      {latest ? (
        <>
          {latest.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={latest.thumb}
              alt=""
              style={{ width: 36, height: 26, objectFit: "cover", borderRadius: 5, flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: c,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                fontFamily: DS.font,
              }}
            >
              Bài {latest.so}
            </p>
            <p
              style={{
                fontSize: 10,
                color: DS.colorSub,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 110,
                fontFamily: DS.font,
              }}
            >
              {latest.tenBai}
            </p>
          </div>
        </>
      ) : (
        <span style={{ fontSize: 10, color: "#d1d5db", fontStyle: "italic", fontFamily: DS.font }}>
          Chưa học
        </span>
      )}
    </div>
  );
}

function SortBtn({
  active,
  dir,
  onClick,
}: {
  active: boolean;
  dir: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 10px",
        height: 38,
        borderRadius: 10,
        border: `1.5px solid ${active ? DS.colorTeacher : DS.colorBorder}`,
        background: active ? `${DS.colorTeacher}12` : DS.colorBg,
        color: active ? DS.colorTeacher : "#94a3b8",
        fontFamily: DS.font,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
      Tình trạng
      {active ? (
        <span style={{ fontSize: 10, opacity: 0.8 }}>{dir === "asc" ? "↑" : "↓"}</span>
      ) : null}
    </button>
  );
}

export type StudentManageModalProps = {
  open: boolean;
  onClose: () => void;
  lopHocId: number;
  classDisplayName: string;
  /** `hr_nhan_su.id` của GV đang đăng nhập — cần cho API lưu tiến độ (service role verify chủ nhiệm). */
  teacherHrId: number;
  /** Lọc gợi ý cột tiến độ (tên môn, substring). */
  filterSubject?: string;
  /** Gọi sau khi lưu tiến độ bài (để sidebar đồng bộ). */
  onAfterProgressSave?: () => void;
};

const TH: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  flexShrink: 0,
};

const COL = {
  num: 38,
  name: 160,
  cls: 80,
  status: 100,
  year: 65,
  /** Nhiều dòng: Trường — Ngành */
  truongNganh: 240,
};

export default function StudentManageModal({
  open,
  onClose,
  lopHocId,
  classDisplayName,
  teacherHrId,
  filterSubject = "",
  onAfterProgressSave,
}: StudentManageModalProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const openRef = useRef(open);
  openRef.current = open;

  const [students, setStudents] = useState<StudentManageRow[]>([]);
  const [filtered, setFiltered] = useState<StudentManageRow[]>([]);
  const [exBySubject, setExBySubject] = useState<Record<string, ExerciseItem[]>>({});
  const [totalBySubject, setTotalBySubject] = useState<Record<string, number>>({});
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [localFilterSubject, setLocalFilterSubject] = useState(filterSubject);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<StudentManageRow | null>(null);
  /** `ql_mon_hoc.ten_mon_hoc` của lớp hiện tại — filter picker theo môn lớp. */
  const [lopTenMonHoc, setLopTenMonHoc] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>("asc");
  /** Compact: mặc định thu gọn; chỉ enrollmentId trong Set là đang mở rộng (trường/ngành + ProgressCard đầy đủ). */
  const [compactExpandedIds, setCompactExpandedIds] = useState<Set<number>>(() => new Set());

  type ManageMainTab = "danh-sach" | "diem-danh";
  const [mainTab, setMainTab] = useState<ManageMainTab>("danh-sach");
  const [ddRows, setDdRows] = useState<PhDiemDanhNgayRow[]>([]);
  const [ddLoading, setDdLoading] = useState(false);
  const [ddError, setDdError] = useState<string | null>(null);
  const [ddFrom, setDdFrom] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() - 7);
    return vnCalendarDateString(t);
  });
  const [ddTo, setDdTo] = useState(() => vnCalendarDateString());

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isCompact = isMobile || isTablet;

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setError("Thiếu cấu hình Supabase (NEXT_PUBLIC_SUPABASE_*).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStep("Đang tải dữ liệu…");
      const [exRows, stuRows, tenMonLop] = await Promise.all([
        fetchExercisesForManage(supabase),
        fetchStudentsForClassManage(supabase, lopHocId, classDisplayName),
        fetchTenMonHocForLop(supabase, lopHocId),
      ]);
      const { bySubject, totalBySubject: totMap } = buildExerciseModel(exRows);
      if (!openRef.current) return;
      setLopTenMonHoc(tenMonLop);
      setExBySubject(bySubject);
      setTotalBySubject(totMap);
      setAllSubjects(Object.keys(bySubject).sort());
      setStudents(stuRows);
      setFetched(true);

      stuRows.forEach((s) => {
        if (!s.studentId) return;
        void fetchTruongNganhLabelsForHv(supabase, s.studentId).then((pairs) => {
          if (!openRef.current) return;
          setStudents((prev) =>
            prev.map((p) =>
              p.enrollmentId === s.enrollmentId ? { ...p, truongNganhPairs: pairs } : p
            )
          );
        });
      });
    } catch (e: unknown) {
      if (openRef.current) {
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      }
    } finally {
      if (openRef.current) {
        setLoading(false);
        setStep("");
      }
    }
  }, [supabase, lopHocId, classDisplayName]);

  useEffect(() => {
    if (open && !fetched && !loading) void fetchData();
  }, [open, fetched, loading, fetchData]);

  useEffect(() => {
    if (open) setLocalFilterSubject(filterSubject);
  }, [filterSubject, open]);

  useEffect(() => {
    if (!open) {
      setPicker(null);
      setQuery("");
      setError(null);
      setFetched(false);
      setLopTenMonHoc(null);
      setStudents([]);
      setFiltered([]);
      setLoading(false);
      setCompactExpandedIds(new Set());
      setMainTab("danh-sach");
      setDdRows([]);
      setDdError(null);
      setDdLoading(false);
      setDdFrom(() => {
        const t = new Date();
        t.setDate(t.getDate() - 7);
        return vnCalendarDateString(t);
      });
      setDdTo(vnCalendarDateString());
    }
  }, [open]);

  const fetchDiemDanh = useCallback(async () => {
    if (!Number.isFinite(lopHocId) || lopHocId <= 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ddFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(ddTo)) {
      setDdError("Chọn khoảng ngày hợp lệ.");
      return;
    }
    setDdLoading(true);
    setDdError(null);
    try {
      const u = new URL("/api/phong-hoc/diem-danh", window.location.origin);
      u.searchParams.set("lopHocId", String(lopHocId));
      u.searchParams.set("ngayFrom", ddFrom);
      u.searchParams.set("ngayTo", ddTo);
      const r = await fetch(u.toString(), { credentials: "include" });
      const j = (await r.json()) as { rows?: PhDiemDanhNgayRow[]; error?: string };
      if (!r.ok) {
        setDdRows([]);
        setDdError(j.error ?? "Không tải được điểm danh.");
        return;
      }
      setDdRows(j.rows ?? []);
    } catch (e: unknown) {
      setDdRows([]);
      setDdError(e instanceof Error ? e.message : "Lỗi mạng.");
    } finally {
      setDdLoading(false);
    }
  }, [lopHocId, ddFrom, ddTo]);

  useEffect(() => {
    if (!open || mainTab !== "diem-danh") return;
    void fetchDiemDanh();
  }, [open, mainTab, fetchDiemDanh]);

  useEffect(() => {
    let list = students;
    const q = s2l(query).trim();
    if (q) {
      list = list.filter((s) => {
        if (s2l(s.name).includes(q) || s2l(s.status).includes(q) || s2l(s.namThi).includes(q)) {
          return true;
        }
        if (
          s.truongNganhPairs?.some(
            (p) => s2l(p.truong).includes(q) || s2l(p.nganh).includes(q)
          )
        ) {
          return true;
        }
        return Boolean(
          s.currentEx &&
            (s2l(s.currentEx.so).includes(q) ||
              s2l(s.currentEx.tenBai).includes(q) ||
              s2l(s.currentEx.mon).includes(q))
        );
      });
    }
    if (sortDir !== null) {
      list = [...list].sort((a, b) => {
        const oa = TINH_TRANG_ORDER[a.status] ?? 99;
        const ob = TINH_TRANG_ORDER[b.status] ?? 99;
        return sortDir === "asc" ? oa - ob : ob - oa;
      });
    }
    setFiltered(list);
  }, [students, query, sortDir]);

  const openPicker = (s: StudentManageRow) => setPicker(s);

  const savePicker = (enrollmentId: number, newIds: number[]) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId) return s;
        const newId = newIds[0] ?? null;
        const flat = Object.values(exBySubject).flat();
        const currentEx =
          newId != null ? (flat.find((e) => e.id === newId) ?? null) : null;
        const latest: Record<string, ExerciseItem> = {};
        if (currentEx) latest[currentEx.mon] = currentEx;
        return { ...s, tienDoId: newId, currentEx, latest };
      })
    );
    setPicker(null);
    onAfterProgressSave?.();
  };

  const visSub = localFilterSubject.trim()
    ? allSubjects.filter((m) => s2l(m).includes(s2l(localFilterSubject.trim())))
    : allSubjects;

  if (!open) return null;

  if (!supabase) {
    return (
      <AnimatePresence>
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(45,32,32,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: DS.font,
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            style={{
              background: DS.colorBg,
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              boxShadow: "0 32px 100px rgba(0,0,0,.25)",
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Không thể mở quản lý học viên</p>
            <p style={{ fontSize: 14, color: DS.colorSub, marginBottom: 16 }}>
              Thiếu biến môi trường Supabase trên client.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: DS.gradTeacher,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(45,32,32,.55)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? 0 : 20,
          fontFamily: DS.font,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: DS.colorBg,
            borderRadius: isMobile ? 0 : 22,
            width: "100%",
            maxWidth: 1100,
            height: isMobile ? "100dvh" : "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 32px 100px rgba(0,0,0,.25)",
            overflow: "hidden",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`@keyframes phc-shimmer{0%{background-position:-500px 0}100%{background-position:500px 0}}`}</style>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              background: DS.colorBg,
              transform: picker ? "translateX(-100%)" : "translateX(0)",
              transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: `1px solid ${DS.colorSurface}`,
                background: "linear-gradient(135deg,#BC8AF918,#ED5C9D0C)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: DS.gradTeacher,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: DS.colorTeacher,
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    Giáo viên
                  </p>
                  <h2
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: DS.colorText,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Quản lý học viên — {classDisplayName}
                    {!loading && filtered.length > 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: DS.colorTeacher, marginLeft: 8 }}>
                        ({filtered.length})
                      </span>
                    ) : null}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: `1px solid ${DS.colorBorder}`,
                  background: DS.colorSurface,
                  cursor: "pointer",
                  color: DS.colorSub,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Chế độ quản lý"
              style={{
                padding: "8px 22px 0",
                display: "flex",
                gap: 8,
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "danh-sach"}
                onClick={() => setMainTab("danh-sach")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${mainTab === "danh-sach" ? DS.colorTeacher : DS.colorBorder}`,
                  background: mainTab === "danh-sach" ? `${DS.colorTeacher}14` : DS.colorBg,
                  color: mainTab === "danh-sach" ? DS.colorTeacher : DS.colorSub,
                  fontFamily: DS.font,
                  fontSize: 13,
                  fontWeight: mainTab === "danh-sach" ? 700 : 600,
                  cursor: "pointer",
                }}
              >
                Danh sách học viên
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "diem-danh"}
                onClick={() => setMainTab("diem-danh")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${mainTab === "diem-danh" ? DS.colorTeacher : DS.colorBorder}`,
                  background: mainTab === "diem-danh" ? `${DS.colorTeacher}14` : DS.colorBg,
                  color: mainTab === "diem-danh" ? DS.colorTeacher : DS.colorSub,
                  fontFamily: DS.font,
                  fontSize: 13,
                  fontWeight: mainTab === "diem-danh" ? 700 : 600,
                  cursor: "pointer",
                }}
              >
                Điểm danh phòng học
              </button>
            </div>

            {mainTab === "danh-sach" ? (
              <>
            <div
              style={{
                padding: "14px 22px 0",
                display: "flex",
                gap: 8,
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                    display: "flex",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm học viên hoặc bài tập…"
                  style={{
                    width: "100%",
                    height: 38,
                    border: `1.5px solid ${DS.colorBorder}`,
                    borderRadius: 10,
                    padding: "0 34px",
                    fontSize: 13,
                    fontFamily: DS.font,
                    color: DS.colorText,
                    background: DS.colorSurface,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      display: "flex",
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              <div style={{ position: "relative", flex: "0 0 160px" }}>
                <input
                  value={localFilterSubject}
                  onChange={(e) => setLocalFilterSubject(e.target.value)}
                  placeholder="Lọc môn học…"
                  style={{
                    width: "100%",
                    height: 38,
                    border: `1.5px solid ${DS.colorBorder}`,
                    borderRadius: 10,
                    padding: "0 34px 0 12px",
                    fontSize: 13,
                    fontFamily: DS.font,
                    color: DS.colorText,
                    background: DS.colorSurface,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {localFilterSubject ? (
                  <button
                    type="button"
                    onClick={() => setLocalFilterSubject("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      display: "flex",
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                      display: "flex",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </span>
                )}
              </div>

              <SortBtn
                active={sortDir !== null}
                dir={sortDir}
                onClick={() =>
                  setSortDir((p) => (p === null ? "asc" : p === "asc" ? "desc" : null))
                }
              />

              <motion.button
                type="button"
                onClick={() => void fetchData()}
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.35 }}
                style={{
                  width: 38,
                  height: 38,
                  border: `1px solid ${DS.colorBorder}`,
                  borderRadius: 10,
                  background: DS.colorBg,
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </motion.button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                margin: "12px 22px 20px",
                border: `1px solid ${DS.colorBorder}`,
                borderRadius: 12,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  background: DS.colorSurface,
                  borderBottom: `1px solid ${DS.colorBorder}`,
                  flexShrink: 0,
                }}
              >
                {isCompact ? (
                  <div style={{ ...TH, flex: 1 }}>Học viên &amp; tiến độ</div>
                ) : (
                  <>
                    <div style={{ ...TH, width: COL.num }}>#</div>
                    <div style={{ ...TH, width: COL.name }}>Họ tên</div>
                    <div style={{ ...TH, width: COL.cls }}>Lớp</div>
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSortDir((p) => (p === null ? "asc" : p === "asc" ? "desc" : null));
                        }
                      }}
                      onClick={() =>
                        setSortDir((p) => (p === null ? "asc" : p === "asc" ? "desc" : null))
                      }
                      style={{
                        ...TH,
                        width: COL.status,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: sortDir !== null ? DS.colorTeacher : "#94a3b8",
                        userSelect: "none",
                      }}
                    >
                      Tình trạng
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      {sortDir === "asc" ? <span style={{ fontSize: 9 }}>↑</span> : null}
                      {sortDir === "desc" ? <span style={{ fontSize: 9 }}>↓</span> : null}
                    </div>
                    <div style={{ ...TH, width: COL.year }}>Năm thi</div>
                    <div style={{ ...TH, width: COL.truongNganh }}>Trường &amp; ngành dự thi</div>
                    <div style={{ ...TH, flex: 1 }}>Tiến độ</div>
                  </>
                )}
              </div>

              <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                {loading ? (
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 10 }}>
                      {step || "Đang tải…"}
                    </p>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: isCompact ? 52 : 50,
                          borderRadius: 9,
                          marginBottom: 6,
                          background: "linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%)",
                          backgroundSize: "500px 100%",
                          animation: "phc-shimmer 1.4s ease infinite",
                          animationDelay: `${i * 0.06}s`,
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                {error ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 14,
                      background: "#fff5f5",
                      margin: 12,
                      borderRadius: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>⚠️</span>
                    <p style={{ fontWeight: 600, color: "#ee5b9f", fontSize: 13, margin: 0, flex: 1 }}>
                      Không thể tải dữ liệu: {error}
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchData()}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 7,
                        border: "1px solid #fca5a5",
                        background: "white",
                        color: "#ee5b9f",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : null}

                {!loading && !error && filtered.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "40px 16px",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>🔍</span>
                    <p style={{ fontWeight: 500, color: DS.colorSub, fontSize: 13 }}>Không tìm thấy kết quả</p>
                  </div>
                ) : null}

                {!loading &&
                  !error &&
                  filtered.map((s, i) => {
                    const studentMon =
                      visSub.find((m) => s.latest[m]) ||
                      Object.keys(s.latest)[0] ||
                      visSub[0] ||
                      allSubjects[0] ||
                      null;

                    if (isCompact) {
                      const compactOpen = compactExpandedIds.has(s.enrollmentId);

                      const toggleCompactRow = (e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setCompactExpandedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.enrollmentId)) next.delete(s.enrollmentId);
                          else next.add(s.enrollmentId);
                          return next;
                        });
                      };

                      return (
                        <div
                          key={s.enrollmentId}
                          onClick={() => {
                            if (!compactOpen) {
                              setCompactExpandedIds((prev) => {
                                const next = new Set(prev);
                                next.add(s.enrollmentId);
                                return next;
                              });
                            }
                          }}
                          style={{
                            padding: compactOpen ? "10px 12px" : "8px 10px",
                            display: "grid",
                            gridTemplateColumns: "18px 36px minmax(0, 1fr) 28px",
                            columnGap: 10,
                            rowGap: compactOpen ? 6 : 0,
                            alignItems: "start",
                            borderBottom: "1px solid #f8fafc",
                            cursor: compactOpen ? "default" : "pointer",
                            transition: "background .1s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              gridColumn: 1,
                              gridRow: 1,
                              fontSize: 10,
                              color: "#cbd5e1",
                              fontWeight: 700,
                              paddingTop: compactOpen ? 5 : 4,
                              lineHeight: 1,
                            }}
                          >
                            {i + 1}
                          </span>
                          <div
                            style={{
                              gridColumn: 2,
                              gridRow: 1,
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: `hsl(${(s.name.charCodeAt(0) * 37) % 360},60%,56%)`,
                              color: "white",
                              fontSize: 13,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ gridColumn: 3, gridRow: 1, minWidth: 0 }}>
                            {!compactOpen ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  gap: "6px 10px",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {s.name}
                                  </p>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 3,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <TinhTrangBadge value={s.status} />
                                  </div>
                                </div>
                                <div
                                  style={{
                                    flexShrink: 0,
                                    textAlign: "right",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 8,
                                      fontWeight: 800,
                                      color: "#94a3b8",
                                      letterSpacing: "0.06em",
                                      textTransform: "uppercase",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    Năm thi
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      color: s.namThi === "—" ? "#cbd5e1" : "#0f172a",
                                      lineHeight: 1.1,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {s.namThi}
                                  </span>
                                </div>
                                {studentMon ? (
                                  <div style={{ flexShrink: 0, minWidth: 0, maxWidth: "100%" }}>
                                    <ProgressCard
                                      mon={studentMon}
                                      latest={s.latest[studentMon] || null}
                                      total={totalBySubject[studentMon] || 1}
                                      onClick={() => openPicker(s)}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 10,
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    {s.name}
                                  </p>
                                  <div
                                    style={{
                                      flexShrink: 0,
                                      textAlign: "right",
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      gap: 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: "#94a3b8",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      Năm thi
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: s.namThi === "—" ? "#cbd5e1" : "#0f172a",
                                        lineHeight: 1.1,
                                        fontVariantNumeric: "tabular-nums",
                                      }}
                                    >
                                      {s.namThi}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <TinhTrangBadge value={s.status} />
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            aria-expanded={compactOpen}
                            aria-label={compactOpen ? "Thu gọn dòng học viên" : "Mở rộng trường ngành và tiến độ"}
                            onClick={toggleCompactRow}
                            style={{
                              gridColumn: 4,
                              gridRow: 1,
                              width: 26,
                              height: 26,
                              margin: 0,
                              padding: 0,
                              border:
                                compactOpen
                                  ? `1px solid ${DS.colorTeacher}55`
                                  : "1px solid rgba(226, 232, 240, 0.95)",
                              borderRadius: 7,
                              background: compactOpen ? `${DS.colorTeacher}0d` : "rgba(248, 250, 252, 0.85)",
                              color: compactOpen ? DS.colorTeacher : "#9ca3af",
                              cursor: "pointer",
                              flexShrink: 0,
                              justifySelf: "end",
                              alignSelf: "start",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                              boxShadow: compactOpen ? "none" : "inset 0 1px 0 rgba(255,255,255,0.7)",
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                              style={{
                                display: "block",
                                transform: compactOpen ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>

                          {compactOpen ? (
                            <div
                              style={{
                                gridColumn: "1 / -1",
                                gridRow: 2,
                                marginTop: 2,
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "stretch",
                                gap: 8,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  flex: "1 1 0%",
                                  minWidth: 0,
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  background: "#f1f5f9",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: "#94a3b8",
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                    marginBottom: 4,
                                  }}
                                >
                                  Trường &amp; ngành dự thi
                                </span>
                                {s.truongNganhPairs === null ? (
                                  <div
                                    style={{
                                      height: 12,
                                      width: "65%",
                                      maxWidth: 180,
                                      borderRadius: 4,
                                      background:
                                        "linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%)",
                                      backgroundSize: "200px 100%",
                                      animation: "phc-shimmer 1.4s ease infinite",
                                    }}
                                  />
                                ) : s.truongNganhPairs.length ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 5,
                                      alignContent: "flex-start",
                                    }}
                                  >
                                    {s.truongNganhPairs.map((p, j) => (
                                      <span
                                        key={`${p.truong}-${p.nganh}-${j}`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "baseline",
                                          flexWrap: "wrap",
                                          gap: 3,
                                          maxWidth: "100%",
                                          padding: "3px 6px",
                                          borderRadius: 6,
                                          fontSize: 9,
                                          lineHeight: 1.3,
                                          fontWeight: 600,
                                          color: "#334155",
                                          background: "#fff",
                                          border: "1px solid #e2e8f0",
                                          boxShadow: "0 1px 0 rgba(45,32,32,.06)",
                                        }}
                                      >
                                        <span style={{ fontWeight: 800, color: "#0f172a" }}>{p.truong}</span>
                                        <span style={{ color: "#94a3b8", fontWeight: 700 }}>·</span>
                                        <span style={{ fontWeight: 600 }}>{p.nganh}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>
                                    Chưa khai báo trường / ngành
                                  </span>
                                )}
                              </div>
                              {studentMon ? (
                                <div
                                  style={{
                                    flexShrink: 0,
                                    alignSelf: "center",
                                    minWidth: 0,
                                  }}
                                >
                                  <ProgressCard
                                    mon={studentMon}
                                    latest={s.latest[studentMon] || null}
                                    total={totalBySubject[studentMon] || 1}
                                    onClick={() => openPicker(s)}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={s.enrollmentId}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "9px 14px",
                          minHeight: 50,
                          borderBottom: "1px solid #f8fafc",
                          cursor: "pointer",
                          transition: "background .1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        }}
                        onClick={() => openPicker(s)}
                      >
                        <div
                          style={{
                            width: COL.num,
                            flexShrink: 0,
                            fontSize: 11,
                            color: "#cbd5e1",
                            fontWeight: 600,
                            paddingTop: 3,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div
                          style={{
                            width: COL.name,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            overflow: "hidden",
                            paddingTop: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: `hsl(${(s.name.charCodeAt(0) * 37) % 360},60%,56%)`,
                              color: "white",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.name}
                          </span>
                        </div>
                        <div style={{ width: COL.cls, flexShrink: 0, overflow: "hidden", paddingTop: 3 }}>
                          {s.className ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: 20,
                                fontSize: 10,
                                fontWeight: 500,
                                background: "#f3f4f6",
                                color: "#374151",
                                border: "1px solid #e5e7eb",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                              }}
                            >
                              {s.className}
                            </span>
                          ) : (
                            <span style={{ color: "#e5e7eb" }}>—</span>
                          )}
                        </div>
                        <div style={{ width: COL.status, flexShrink: 0, paddingTop: 3 }}>
                          <TinhTrangBadge value={s.status} />
                        </div>
                        <div style={{ width: COL.year, flexShrink: 0, paddingTop: 3 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: s.namThi === "—" ? "#d1d5db" : "#0f172a",
                            }}
                          >
                            {s.namThi}
                          </span>
                        </div>
                        <div
                          style={{
                            width: COL.truongNganh,
                            flexShrink: 0,
                            overflow: "hidden",
                            alignSelf: "flex-start",
                            paddingTop: 2,
                          }}
                        >
                          {s.truongNganhPairs === null ? (
                            <div
                              style={{
                                height: 12,
                                width: "80%",
                                borderRadius: 4,
                                background:
                                  "linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%)",
                                backgroundSize: "200px 100%",
                                animation: "phc-shimmer 1.4s ease infinite",
                              }}
                            />
                          ) : s.truongNganhPairs.length === 0 ? (
                            <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {s.truongNganhPairs.map((p, j) => (
                                <span
                                  key={`${p.truong}-${p.nganh}-${j}`}
                                  style={{
                                    fontSize: 10,
                                    color: "#374151",
                                    lineHeight: 1.35,
                                    display: "block",
                                  }}
                                >
                                  {p.truong} — {p.nganh}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden", paddingTop: 3 }}>
                          {studentMon ? (
                            <ProgressCard
                              mon={studentMon}
                              latest={s.latest[studentMon] || null}
                              total={totalBySubject[studentMon] || 1}
                              onClick={() => openPicker(s)}
                            />
                          ) : (
                            <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  margin: "12px 22px 20px",
                  border: `1px solid ${DS.colorBorder}`,
                  borderRadius: 12,
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: DS.colorSurface,
                    borderBottom: `1px solid ${DS.colorBorder}`,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.colorText }}>Khoảng ngày (VN)</span>
                  <label style={{ fontSize: 12, color: DS.colorSub, display: "flex", alignItems: "center", gap: 6 }}>
                    Từ
                    <input
                      type="date"
                      value={ddFrom}
                      onChange={(e) => setDdFrom(e.target.value)}
                      style={{
                        height: 36,
                        border: `1px solid ${DS.colorBorder}`,
                        borderRadius: 8,
                        padding: "0 8px",
                        fontFamily: DS.font,
                        fontSize: 13,
                        color: DS.colorText,
                        background: DS.colorBg,
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: DS.colorSub, display: "flex", alignItems: "center", gap: 6 }}>
                    Đến
                    <input
                      type="date"
                      value={ddTo}
                      onChange={(e) => setDdTo(e.target.value)}
                      style={{
                        height: 36,
                        border: `1px solid ${DS.colorBorder}`,
                        borderRadius: 8,
                        padding: "0 8px",
                        fontFamily: DS.font,
                        fontSize: 13,
                        color: DS.colorText,
                        background: DS.colorBg,
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void fetchDiemDanh()}
                    disabled={ddLoading}
                    style={{
                      marginLeft: "auto",
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: DS.gradTeacher,
                      color: "#fff",
                      fontFamily: DS.font,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: ddLoading ? "wait" : "pointer",
                      opacity: ddLoading ? 0.75 : 1,
                    }}
                  >
                    Tải lại
                  </button>
                </div>

                {ddLoading ? (
                  <div style={{ padding: "16px 14px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                    Đang tải điểm danh…
                  </div>
                ) : null}

                {ddError && !ddLoading ? (
                  <div
                    style={{
                      margin: "10px 14px 0",
                      padding: 12,
                      borderRadius: 10,
                      background: "#fff5f5",
                      fontSize: 13,
                      color: "#ee5b9f",
                      fontWeight: 600,
                    }}
                  >
                    {ddError}
                  </div>
                ) : null}

                <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                  {!ddLoading && !ddError && ddRows.length === 0 ? (
                    <div
                      style={{
                        padding: "48px 16px",
                        textAlign: "center",
                        fontSize: 13,
                        color: DS.colorSub,
                      }}
                    >
                      Chưa có dòng điểm danh trong khoảng đã chọn (hoặc bảng chưa được tạo trên Supabase).
                    </div>
                  ) : null}

                  {!ddLoading && ddRows.length > 0 ? (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                        fontFamily: DS.font,
                      }}
                    >
                      <thead>
                        <tr style={{ background: DS.colorSurface, borderBottom: `1px solid ${DS.colorBorder}` }}>
                          <th style={{ ...TH, textAlign: "left", padding: "10px 14px" }}>Ngày</th>
                          <th style={{ ...TH, textAlign: "left", padding: "10px 14px" }}>Họ tên</th>
                          <th style={{ ...TH, textAlign: "center", padding: "10px 14px", width: 110 }}>
                            Vào phòng
                          </th>
                          <th style={{ ...TH, textAlign: "center", padding: "10px 14px", width: 110 }}>
                            Gửi ảnh
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ddRows.map((row) => (
                          <tr
                            key={`${row.ngay}-${row.hoc_vien_id}-${row.id}`}
                            style={{ borderBottom: `1px solid ${DS.colorBorder}` }}
                          >
                            <td style={{ padding: "10px 14px", color: DS.colorText, fontVariantNumeric: "tabular-nums" }}>
                              {row.ngay}
                            </td>
                            <td style={{ padding: "10px 14px", color: DS.colorText, fontWeight: 600 }}>
                              {row.full_name?.trim() || `HV #${row.hoc_vien_id}`}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", color: row.da_vao_phong ? "#15803d" : DS.colorMuted }}>
                              {row.da_vao_phong ? "✓" : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", color: row.da_gui_anh ? "#15803d" : DS.colorMuted }}>
                              {row.da_gui_anh ? "✓" : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              background: DS.colorBg,
              transform: picker ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            {picker ? (
              <StudentManageLessonPicker
                student={picker}
                exBySubject={exBySubject}
                allSubjects={allSubjects}
                lopTenMonHoc={lopTenMonHoc}
                filterSubjectFallback={localFilterSubject}
                lopHocId={lopHocId}
                teacherHrId={teacherHrId}
                onSave={(newIds) => savePicker(picker.enrollmentId, newIds)}
                onBack={() => setPicker(null)}
              />
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
