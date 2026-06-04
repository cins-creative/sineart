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
import {
  lookupClassroomByEmail,
  type LookupClassroomOutcome,
} from "@/lib/phong-hoc/lookup-by-email";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
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

/** Cảnh báo sắp hết kỳ — vẫn cho vào lớp nếu còn > 0 ngày; chỉ nút/link «Đóng học phí» dẫn tới trang thanh toán. */
const DAYS_LOW_KY_WARNING = 3;

function enrollmentLooksInactive(data: ClassroomStudentSessionData): boolean {
  const pack = `${data.status ?? ""} ${data.trang_thai ?? ""}`.toLowerCase();
  if (!pack.trim()) return false;
  return (
    /\bnghỉ\b/.test(pack) ||
    /\bnghi\b/.test(pack) ||
    /\bthôi\s*học\b/.test(pack) ||
    /\bđình\s*chỉ\b/.test(pack)
  );
}

function studentCanEnterPhongHoc(data: ClassroomStudentSessionData): boolean {
  if (enrollmentLooksInactive(data)) return false;
  const d = data.days_remaining;
  if (d === null || d <= 0) return false;
  return true;
}

function daysColor(d: number | null, data: ClassroomStudentSessionData): string {
  if (enrollmentLooksInactive(data)) return "#ee5ca2";
  if (d === null) return "#aaa";
  if (d < 0) return "#ee5ca2";
  if (d === 0) return "#d32f2f";
  if (d < DAYS_LOW_KY_WARNING) return "#f8a568";
  if (d <= 5) return "#f8a568";
  return "#4caf50";
}

function daysLabel(d: number | null, data: ClassroomStudentSessionData): string {
  if (enrollmentLooksInactive(data)) return "Hết hạn ngày học";
  if (d === null) return "Chưa có kỳ học";
  if (d < 0) return `Nợ ${Math.abs(d)} ngày`;
  if (d === 0) return "Hết hạn";
  if (d < DAYS_LOW_KY_WARNING) return `Sắp hết hạn — còn ${d} ngày`;
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
    return (
      <Image
        src={src}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        onError={() => setErr(true)}
        unoptimized={nextImageShouldUnoptimize(src)}
      />
    );
  }
  return <span style={{ fontSize: 32 }}>{isTeacher ? "👩‍🏫" : "🎨"}</span>;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Ưu tiên hơn prefill từ session — vd. email đã xác nhận ở popup Đăng nhập Nav. */
  initialEmail?: string;
};

export default function ClassroomSignInOverlay({ open, onClose, initialEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [records, setRecords] = useState<ClassroomSessionRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsCreateAccount, setNeedsCreateAccount] = useState(false);
  const [mounted, setMounted] = useState(false);

  const resetFormState = () => {
    setRecords([]);
    setEmail("");
    setMessage("");
    setNeedsCreateAccount(false);
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
        setNeedsCreateAccount(false);
        setMessage("Đang tải danh sách lớp…");
      }
      try {
        let outcome: LookupClassroomOutcome | null = null;
        try {
          const apiRes = await fetch("/api/phong-hoc/lookup-classroom-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmed }),
          });
          if (apiRes.ok) {
            outcome = (await apiRes.json()) as LookupClassroomOutcome;
          }
        } catch {
          /* mạng / API — fallback Supabase trình duyệt */
        }
        if (!outcome) {
          outcome = await lookupClassroomByEmail(supabase, trimmed);
        }

        const { records: found, studentProfileWithoutEnrollment, teacherWithoutClass } = outcome;
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
              "Không tìm thấy tài khoản với email này. Vui lòng tạo tài khoản học viên trên Sine Art trước khi vào lớp."
            );
            setNeedsCreateAccount(true);
          }
          if (!isCancelled()) setLoading(false);
          return;
        }
        const name =
          found[0].userType === "Teacher"
            ? `Xin chào ${found[0].data.full_name || "Giáo viên"}`
            : `Chào mừng học viên ${found[0].data.full_name || "Học viên"}`;
        if (!isCancelled()) {
          setMessage(name);
          setRecords(found);
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
    const fromProp = initialEmail?.trim() ?? "";
    const fromSession = readClassroomSessionEmailForPrefill() ?? "";
    const em = fromProp.length > 0 ? fromProp : fromSession;
    if (!em) return;
    let cancelled = false;
    const isCancelled = () => cancelled;
    setEmail(em);
    void lookupWithEmail(em, isCancelled);
    return () => {
      cancelled = true;
    };
  }, [open, initialEmail, lookupWithEmail]);

  /** Làm nóng `/phong-hoc/[slug]` ngay khi có danh sách — click sau phản hồi nhanh hơn (ít chờ RSC). */
  useEffect(() => {
    if (!open || records.length === 0) return;
    for (const item of records) {
      const slug = phongHocSlugFromClassName(item.data.class_name);
      if (slug) router.prefetch(`/phong-hoc/${encodeURIComponent(slug)}`);
    }
  }, [open, records, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enterClass = (item: ClassroomSessionRecord) => {
    const slug = phongHocSlugFromClassName(item.data.class_name);
    if (!slug) {
      window.alert("Lớp chưa có mã class_name trên hệ thống. Vui lòng liên hệ Sine Art.");
      return;
    }
    saveClassroomSession(item);
    const target = `/phong-hoc/${encodeURIComponent(slug)}`;
    if (typeof window !== "undefined") {
      const m = window.location.pathname.match(/^\/phong-hoc\/([^/]+)\/?$/);
      const here = m?.[1] != null ? normalizePhongHocPathSlug(m[1]) : null;
      const there = normalizePhongHocPathSlug(slug);
      if (here === there) {
        onClose();
        setTimeout(resetFormState, 320);
        return;
      }
    }
    /** Điều hướng trước khi đóng overlay để Next bắt đầu fetch ngay — không chờ animation đóng modal. */
    router.push(target);
    onClose();
    setTimeout(resetFormState, 320);
  };

  const checkUser = () => {
    void lookupWithEmail(email, () => false);
  };

  const paymentHref = email.trim()
    ? `/donghocphi?email=${encodeURIComponent(email.trim())}`
    : "/donghocphi";

  const createAccountHref = paymentHref;

  /** Chỉ vào lớp từ card — không điều hướng tới `/donghocphi` (link đóng phí nằm riêng). */
  const handleCardEnter = (item: ClassroomSessionRecord) => {
    if (item.userType === "Teacher") {
      enterClass(item);
      return;
    }
    if (studentCanEnterPhongHoc(item.data)) {
      enterClass(item);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
          key="cso-root"
          className="cso-overlay-outer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setNeedsCreateAccount(false);
                    }}
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
                  {needsCreateAccount ? (
                    <div className="cso-create-account">
                      <p>Chưa có tài khoản? Tạo hồ sơ học viên để Sine Art ghi nhận lớp học của bạn.</p>
                      <Link
                        href={createAccountHref}
                        className="cso-create-account-link"
                        onClick={closeOverlay}
                      >
                        Tạo tài khoản Sine Art
                      </Link>
                    </div>
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
                      const canEnter = isTeacher || studentCanEnterPhongHoc(item.data);
                      const showDhpBesideEnter =
                        !isTeacher &&
                        canEnter &&
                        d !== null &&
                        d > 0 &&
                        d <= DAYS_LOW_KY_WARNING;
                      const borderColor = isTeacher ? "#bc8af9" : "#eaeaea";
                      const thumb = item.data.class_avatar || "";
                      return (
                        <motion.div
                          key={`${item.userType}-${idx}-${item.data.lop_hoc_id}`}
                          className={`cso-card${!isTeacher && !canEnter ? " cso-card--blocked" : ""}`}
                          style={{ borderColor }}
                          variants={iVariants}
                          whileHover={
                            canEnter
                              ? { scale: 1.02, backgroundColor: "#f9f9fb", zIndex: 1 }
                              : { scale: 1, backgroundColor: "#f5f5f7" }
                          }
                          whileTap={canEnter ? { scale: 0.98 } : { scale: 1 }}
                          role={canEnter ? "button" : undefined}
                          tabIndex={canEnter ? 0 : undefined}
                          onClick={() => {
                            if (canEnter) handleCardEnter(item);
                          }}
                          onKeyDown={(e) => {
                            if (!canEnter) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCardEnter(item);
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
                                  style={{ color: daysColor(d, item.data) }}
                                  title="Theo kỳ học phí đã thanh toán — chưa cộng buổi từ gói đang chọn ở bước Đóng học phí (chưa thanh toán)."
                                >
                                  {daysLabel(d, item.data)}
                                </span>
                                <div className="cso-row-foot-actions">
                                  {canEnter ? (
                                    <>
                                      <button
                                        type="button"
                                        className="cso-link-enter"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          enterClass(item);
                                        }}
                                      >
                                        Vào lớp
                                      </button>
                                      {showDhpBesideEnter ? (
                                        <Link
                                          href={paymentHref}
                                          className="cso-link-dhp"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Đóng học phí
                                        </Link>
                                      ) : null}
                                    </>
                                  ) : (
                                    <Link
                                      href={paymentHref}
                                      className="cso-link-dhp"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Đóng học phí
                                    </Link>
                                  )}
                                </div>
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
          <div
            className="cso-backdrop"
            aria-hidden
            onClick={closeOverlay}
          />
        </motion.div>
    </AnimatePresence>,
    document.body
  );
}
