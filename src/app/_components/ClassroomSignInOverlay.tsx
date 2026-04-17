"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  readClassroomSessionEmailForPrefill,
  saveClassroomSession,
  type ClassroomSessionRecord,
  type ClassroomStudentSessionData,
} from "@/lib/phong-hoc/classroom-session";
import {
  normalizePhongHocPathSlug,
  phongHocSlugFromClassName,
} from "@/lib/phong-hoc/classroom-url";
import { lookupClassroomByEmail } from "@/lib/phong-hoc/lookup-by-email";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./classroom-sign-in-overlay.css";

const cVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const iVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

function daysColor(d: number | null): string {
  if (d === null) return "#aaa";
  if (d < 0) return "#ee5ca2";
  if (d <= 5) return "#f8a568";
  return "#4caf50";
}

function daysLabel(d: number | null): string {
  if (d === null) return "Chưa có kỳ học";
  if (d < 0) return `Nợ ${Math.abs(d)} ngày`;
  return `Còn lại: ${d} ngày`;
}

/** Tránh hiển thị " | " khi không có trường/ngành; ưu tiên lịch học từ `ql_lop_hoc.lich_hoc`. */
function studentCardInfoLine(data: ClassroomStudentSessionData & { lich_hoc?: string }): string {
  const lich = data.lich_hoc?.trim() ?? "";
  let school = "";
  if (data.truong_nganh_pairs && data.truong_nganh_pairs.length > 0) {
    school = data.truong_nganh_pairs
      .map((p) => {
        const a = p.truong?.trim() ?? "";
        const b = p.nganh?.trim() ?? "";
        if (!a && !b) return "";
        if (!a) return b;
        if (!b) return a;
        return `${a} — ${b}`;
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (!school) {
    school = [data.truong_dai_hoc, data.nganh_dao_tao]
      .map((s) => (s != null ? String(s).trim() : ""))
      .filter(Boolean)
      .join(" · ");
  }
  if (lich && school) return `${lich} · ${school}`;
  if (lich) return lich;
  if (school) return school;
  return "—";
}

function ClassThumb({ src, isTeacher }: { src: string; isTeacher: boolean }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    // eslint-disable-next-line @next/next/no-img-element -- URL ngoài / Cloudflare
    return <img src={src} alt="" onError={() => setErr(true)} />;
  }
  return <span style={{ fontSize: 32 }}>{isTeacher ? "👩‍🏫" : "🎨"}</span>;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ClassroomSignInOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [records, setRecords] = useState<ClassroomSessionRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetFormState = () => {
    setRecords([]);
    setEmail("");
    setMessage("");
  };

  const closeOverlay = () => {
    onClose();
    setTimeout(resetFormState, 320);
  };

  const lookupWithEmail = useCallback(
    async (addr: string, isCancelled: () => boolean): Promise<void> => {
      const trimmed = addr.trim();
      if (!trimmed) {
        if (!isCancelled()) setMessage("Vui lòng nhập Email!");
        return;
      }
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (!isCancelled()) setMessage("Chưa cấu hình kết nối (NEXT_PUBLIC_SUPABASE_*).");
        return;
      }
      if (!isCancelled()) {
        setLoading(true);
        setMessage("Đang tải danh sách lớp…");
      }
      try {
        const { records: found, studentProfileWithoutEnrollment, teacherWithoutClass } =
          await lookupClassroomByEmail(supabase, trimmed);
        if (isCancelled()) return;
        if (found.length === 0) {
          if (studentProfileWithoutEnrollment) {
            setMessage(
              "Đã có hồ sơ học viên với email này nhưng chưa thấy lớp ghi danh trên hệ thống. Vui lòng liên hệ Fanpage / CSKH Sine Art để kiểm tra lớp hoặc cập nhật email trong hồ sơ."
            );
          } else if (teacherWithoutClass) {
            setMessage(
              "Tài khoản giáo viên đã khớp nhưng chưa có lớp được gán trên hệ thống. Vui lòng liên hệ quản trị Sine Art."
            );
          } else {
            setMessage(
              "Không tìm thấy tài khoản với email này. Hãy dùng đúng email đã khai báo tại Sine Art (học viên hoặc giáo viên). Nếu cần hỗ trợ, liên hệ Fanpage Sine Art."
            );
          }
          if (!isCancelled()) setLoading(false);
          return;
        }
        const accessible = found.filter((r) => {
          if (r.userType === "Teacher") return true;
          const d = r.data.days_remaining;
          return d !== null && d > 0;
        });
        if (accessible.length === 0) {
          if (!isCancelled()) {
            setMessage("Tài khoản đã hết hạn truy cập. Vui lòng liên hệ Sine Art.");
            setLoading(false);
          }
          return;
        }
        const name =
          accessible[0].userType === "Teacher"
            ? `Xin chào ${accessible[0].data.full_name || "Giáo viên"}`
            : `Chào mừng học viên ${accessible[0].data.full_name || "Học viên"}`;
        if (!isCancelled()) {
          setMessage(name);
          setRecords(accessible);
        }
      } catch (err) {
        if (!isCancelled()) {
          setMessage("Lỗi kết nối dữ liệu. Vui lòng thử lại.");
          console.error("[ClassroomSignIn]", err);
        }
      }
      if (!isCancelled()) setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const em = readClassroomSessionEmailForPrefill();
    if (!em) return;
    let cancelled = false;
    const isCancelled = () => cancelled;
    setEmail(em);
    void lookupWithEmail(em, isCancelled);
    return () => {
      cancelled = true;
    };
  }, [open, lookupWithEmail]);

  const enterClass = (item: ClassroomSessionRecord) => {
    const slug = phongHocSlugFromClassName(item.data.class_name);
    if (!slug) {
      window.alert("Lớp chưa có mã class_name trên hệ thống. Vui lòng liên hệ Sine Art.");
      return;
    }
    saveClassroomSession(item);
    onClose();
    const target = `/phong-hoc/${encodeURIComponent(slug)}`;
    if (typeof window !== "undefined") {
      const m = window.location.pathname.match(/^\/phong-hoc\/([^/]+)\/?$/);
      const here = m?.[1] != null ? normalizePhongHocPathSlug(m[1]) : null;
      const there = normalizePhongHocPathSlug(slug);
      if (here === there) {
        setTimeout(resetFormState, 320);
        return;
      }
    }
    router.push(target);
    setTimeout(resetFormState, 320);
  };

  const checkUser = () => {
    void lookupWithEmail(email, () => false);
  };

  const handleAction = (item: ClassroomSessionRecord) => {
    if (item.userType === "Student") {
      const d = item.data.days_remaining;
      if (d === null || d <= 0) {
        window.alert(
          d === null
            ? "Chưa có kỳ học phí hoặc chưa ghi nhận ngày. Vui lòng liên hệ Sine Art."
            : "Chỉ vào được phòng học khi còn ngày học trong kỳ. Vui lòng đóng học phí tại trang Đóng học phí."
        );
        return;
      }
    }
    enterClass(item);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="cso-root"
          className="cso-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeOverlay}
        >
          <motion.div
            layout
            className="cso-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              type="button"
              className="cso-close"
              onClick={closeOverlay}
              aria-label="Đóng"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              ✕
            </motion.button>

            <AnimatePresence mode="wait">
              {records.length === 0 ? (
                <motion.div
                  key="login"
                  className="cso-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <h3 className="cso-title">Sine Art Login</h3>
                  <p className="cso-subtitle">Truy cập vào lớp học của bạn</p>
                  <input
                    type="email"
                    className="cso-input"
                    placeholder="Nhập email của bạn..."
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void checkUser();
                    }}
                  />
                  <motion.button
                    type="button"
                    className="cso-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void checkUser()}
                    disabled={loading}
                  >
                    {loading ? "Đang kiểm tra..." : "Tiếp tục"}
                  </motion.button>
                  {message ? (
                    <p
                      className={
                        loading
                          ? "cso-msg cso-msg--muted"
                          : message.startsWith("Không") ||
                              message.startsWith("Tài khoản") ||
                              message.startsWith("Lỗi") ||
                              message.startsWith("Chưa cấu hình") ||
                              message === "Vui lòng nhập Email!"
                            ? "cso-msg cso-msg--error"
                            : "cso-msg cso-msg--muted"
                      }
                    >
                      {message}
                    </p>
                  ) : null}
                </motion.div>
              ) : null}

              {records.length > 0 ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <p className="cso-list-sub">{message}</p>
                  <motion.div
                    className="cso-scroll cso-hide-sb"
                    variants={cVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {records.map((item, idx) => {
                      const isTeacher = item.userType === "Teacher";
                      const d = isTeacher ? null : item.data.days_remaining;
                      const borderColor = isTeacher ? "#bc8af9" : "#eaeaea";
                      const thumb = item.data.class_avatar || "";
                      return (
                        <motion.div
                          key={`${item.userType}-${idx}-${item.data.lop_hoc_id}`}
                          className="cso-card"
                          style={{ borderColor }}
                          variants={iVariants}
                          whileHover={{ scale: 1.02, backgroundColor: "#f9f9fb", zIndex: 1 }}
                          whileTap={{ scale: 0.98 }}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleAction(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAction(item);
                            }
                          }}
                        >
                          <div className="cso-thumb">
                            <ClassThumb src={thumb} isTeacher={isTeacher} />
                          </div>
                          <div className="cso-card-body">
                            <h4 className="cso-card-title">
                              {item.data.class_full_name || "Lớp học"}
                            </h4>
                            {!isTeacher ? (
                              <span className="cso-card-sub">GV: {item.data.teacher_name}</span>
                            ) : null}
                            <div className="cso-card-info">
                              {isTeacher ? (
                                <span>
                                  Sĩ số: {item.data.so_hoc_vien ?? 0}
                                  {item.data.lich_hoc ? ` · ${item.data.lich_hoc}` : ""}
                                </span>
                              ) : (
                                <span>{studentCardInfoLine(item.data)}</span>
                              )}
                            </div>
                            {!isTeacher ? (
                              <div className="cso-row-foot">
                                <span
                                  className="cso-days"
                                  style={{ color: daysColor(d) }}
                                  title="Theo kỳ học phí đã thanh toán — chưa cộng buổi từ gói đang chọn ở bước Đóng học phí (chưa thanh toán)."
                                >
                                  {daysLabel(d)}
                                </span>
                                <Link
                                  href="/donghocphi"
                                  className="cso-link-dhp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Đóng học phí
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  <button
                    type="button"
                    className="cso-back"
                    onClick={() => {
                      setRecords([]);
                      setEmail("");
                      setMessage("");
                    }}
                  >
                    Đăng nhập email khác
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
