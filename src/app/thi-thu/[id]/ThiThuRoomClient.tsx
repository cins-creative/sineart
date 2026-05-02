"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import ThiThuExamDeAccordion from "./ThiThuExamDeAccordion";
import ThiThuExamProgressBar from "./ThiThuExamProgressBar";
import ThiThuSubmitModal from "./ThiThuSubmitModal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getDebugExamDurationPhut, resolveExamDurationPhut } from "@/lib/thi-thu/debug-exam";
import { parseDeThiJson } from "@/lib/thi-thu/de-thi-json";
import { formatThoiGianSuaBaiLabel, parseThoiGianSuaBaiMs } from "@/lib/thi-thu/replay-time";
import { parseYouTubeEmbedSrc } from "@/lib/thi-thu/youtube-embed";
import { computeElapsedExamMs, computePhase } from "@/lib/thi-thu/phase";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuKyThiRow, ThiThuPhase } from "@/types/thi-thu";

const OPEN_MS = 15 * 60 * 1000;
const LOGO_SRC =
  "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/65b0e187-cbc0-42f6-4978-b3da96efe300/public";

const PREVIEW_PHASES: ThiThuPhase[] = [
  "waiting",
  "countdown",
  "exam_1",
  "break",
  "exam_2",
  "ended",
];

function parsePreviewPhase(s: string | null): ThiThuPhase | null {
  if (!s) return null;
  return PREVIEW_PHASES.includes(s as ThiThuPhase) ? (s as ThiThuPhase) : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtHMS(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function fmtMMSS(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad2(m)}:${pad2(sec)}`;
}

/** Ease — mượt khi vào đề thi */
const TI_EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function ThiThuRoomClient({
  initialKy,
  previewQuery,
  previewAllowed,
}: {
  initialKy: ThiThuKyThiRow;
  previewQuery: string | null;
  previewAllowed: boolean;
}) {
  const [ky, setKy] = useState(initialKy);
  const [offsetMs, setOffsetMs] = useState(0);
  /** Thời “server-align” cập nhật trong effect — tránh Date.now() lúc render (eslint react-hooks/purity) */
  const [now, setNow] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const forcedPhase =
    previewAllowed && previewQuery ? parsePreviewPhase(previewQuery) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/thi-thu/clock");
      const j = (await res.json()) as { serverMs?: number };
      if (!cancelled && typeof j.serverMs === "number") {
        setOffsetMs(j.serverMs - Date.now());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const tick = () => {
      setNow(Date.now() + offsetMs);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [offsetMs]);

  const mon = ky.mon_thi as MonThiKey;
  const cfg = getMonConfig(ky.mon_thi);
  const T = new Date(ky.thoi_gian_bat_dau).getTime();
  const GLs = ky.thoi_gian_giai_lao_bat_dau
    ? new Date(ky.thoi_gian_giai_lao_bat_dau).getTime()
    : null;
  const GLe = ky.thoi_gian_giai_lao_ket_thuc
    ? new Date(ky.thoi_gian_giai_lao_ket_thuc).getTime()
    : null;
  const examPhut = resolveExamDurationPhut(ky);
  const debugPhut = getDebugExamDurationPhut(ky);
  const durMs = examPhut * 60 * 1000;
  const endMs = T + durMs;

  const phase: ThiThuPhase =
    forcedPhase ??
    computePhase({
      mon_thi: mon,
      T,
      GL_start: GLs,
      GL_end: GLe,
      now,
      tieu_de: ky.tieu_de,
    });

  const elapsed = computeElapsedExamMs(phase, T, GLs, GLe, now);
  const progress = durMs > 0 ? Math.min(1, elapsed / durMs) : 0;
  const breakMarkerPct =
    debugPhut == null && cfg.co_giai_lao && GLs != null ? (GLs - T) / durMs : null;
  const breakRangeLabel =
    GLs != null && GLe != null
      ? `${new Date(GLs).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – ${new Date(GLe).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : null;
  const showBreakMarker =
    debugPhut == null &&
    cfg.co_giai_lao &&
    GLs != null &&
    (phase === "exam_1" || phase === "exam_2");

  const id = ky.id;

  const deThiItems = useMemo(() => parseDeThiJson(ky.de_thi ?? null), [ky.de_thi]);

  const endedChamTimeLabel = useMemo(
    () => formatThoiGianSuaBaiLabel(ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai),
    [ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai],
  );

  const suaBaiMs = useMemo(
    () => parseThoiGianSuaBaiMs(ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai),
    [ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai],
  );

  const youtubeEmbedSrc = useMemo(() => parseYouTubeEmbedSrc(ky.video_sua_bai), [ky.video_sua_bai]);

  /** Ngày buổi thi (theo «Giờ bắt đầu» admin) — tiêu đề session video sửa bài. */
  const suaSessionExamDayLabel = useMemo(() => {
    const d = new Date(ky.thoi_gian_bat_dau);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }, [ky.thoi_gian_bat_dau]);

  const previewGradingSession = Boolean(previewAllowed && previewQuery === "sua_bai");

  /**
   * Session 4 (video chấm): chỉ sau session 3 — giữ màn «kết thúc kì thi» đến đúng mốc phát video.
   * Mốc thực tế = max(kết thúc làm bài, giờ lịch phát) để tránh giờ «time-only» trùng ngày thi
   * nhưng đứng trước giờ kết thúc trong timeline gây nhảy sớm sang video.
   */
  const session4VideoStartMs =
    suaBaiMs != null && Number.isFinite(suaBaiMs) ? Math.max(endMs, suaBaiMs) : null;

  const isGradingVideoSession =
    youtubeEmbedSrc != null &&
    (previewGradingSession ||
      (phase === "ended" &&
        session4VideoStartMs != null &&
        now >= session4VideoStartMs));

  const examGradingTickerText = useMemo(() => {
    const sua = formatThoiGianSuaBaiLabel(ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai);
    if (sua) return `Lịch phát video sửa bài / chấm bài: ${sua}`;
    if (ky.lich_cham_bai_url?.trim())
      return "Nhớ xem ảnh lịch chấm bài sau buổi thi — chi tiết trên trang kết thúc.";
    return null;
  }, [ky.thoi_gian_bat_dau, ky.thoi_gian_sua_bai, ky.lich_cham_bai_url]);

  const showExamGradingTicker =
    (phase === "exam_1" || phase === "exam_2") && examGradingTickerText != null;

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const ch1 = supabase
      .channel(`thi-thu-ky-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "thi_thu_ky_thi", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Record<string, unknown>;
          setKy((prev) => ({ ...prev, ...next }) as ThiThuKyThiRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch1);
    };
  }, [id]);

  const countdownToOpen = Math.max(0, T - OPEN_MS - now);
  const countdownToStart = Math.max(0, T - now);
  const remainingExam = Math.max(0, endMs - now);

  const yearLabel = new Date(T).getFullYear();

  const endClock = new Date(endMs).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const tPhase = reduceMotion ? { duration: 0.15 } : { duration: 0.4, ease: TI_EASE_OUT };
  const tExam = reduceMotion ? { duration: 0.15 } : { duration: 0.55, ease: TI_EASE_OUT };
  const tBreak = reduceMotion ? { duration: 0.15 } : { duration: 0.45, ease: TI_EASE_OUT };
  const tEnded = reduceMotion ? { duration: 0.15 } : { duration: 0.45, ease: TI_EASE_OUT };

  return (
    <div className="min-h-[100dvh] min-[900px]:min-h-[calc(100dvh-76px)] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[#2d2020]">
      {forcedPhase ? (
        <div className="sticky top-0 z-[200] bg-amber-100 px-3 py-2 text-center text-xs font-bold text-amber-900">
          PREVIEW MODE — {forcedPhase}
        </div>
      ) : null}
      {!forcedPhase && debugPhut != null ? (
        <div className="sticky top-0 z-[199] bg-violet-100 px-3 py-2 text-center text-[11px] font-bold text-violet-950">
          DEBUG — thời lượng làm bài 3 phút (tiêu đề kỳ có prefix [DEBUG 3m])
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {phase === "waiting" || phase === "countdown" ? (
          <motion.section
            key="pre-exam"
            className={phase === "waiting" ? "tti-wait-wrap px-6" : "tti-cd-wrap"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -16, scale: reduceMotion ? 1 : 0.99 }}
            transition={tPhase}
          >
            {phase === "waiting" ? (
              <>
                <p className="text-sm font-semibold text-[rgba(45,32,32,0.55)]">Phòng thi chưa mở</p>
                <p className="mt-2 text-lg font-bold">Mở phòng sau:</p>
                <p className="tti-cd-timer mt-4">{fmtMMSS(countdownToOpen)}</p>
                <Link href="/thi-thu" className="tti-cd-back mt-8">
                  ← Danh sách kỳ thi
                </Link>
              </>
            ) : (
              <>
                <div className="tti-cd-orb tti-cd-orb-a" aria-hidden />
                <div className="tti-cd-orb tti-cd-orb-b" aria-hidden />
                <div className="tti-cd-orb tti-cd-orb-c" aria-hidden />
                <div className="tti-cd-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo CDN */}
                  <img
                    src={LOGO_SRC}
                    alt="Sine Art"
                    className="tti-cd-logo-img"
                    width={140}
                    height={56}
                    decoding="async"
                  />
                </div>
                <p className="tti-cd-lbl">Đếm ngược trước khi bắt đầu thi</p>
                <div className="tti-cd-timer">{fmtMMSS(countdownToStart)}</div>
                <p className="tti-cd-sub">
                  Phòng thi sẽ tự động mở — hãy chuẩn bị giấy, bút và dụng cụ vẽ
                </p>
                <Link href="/thi-thu" className="tti-cd-back">
                  ← Danh sách kỳ thi
                </Link>
              </>
            )}
          </motion.section>
        ) : phase === "exam_1" || phase === "exam_2" ? (
          <motion.div
            key="exam"
            className={`tti-ex-wrap${showExamGradingTicker ? " tti-ex-wrap--ticker" : ""}`}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -20 }}
            transition={tExam}
          >
            <div className="tti-ex-body">
              <div className="tti-ex-hd">
                <span className="tti-ex-badge">THI THỬ SINE ART {yearLabel}</span>
                <p className="tti-ex-mon">Lớp {cfg.label} online</p>
                <p className="tti-ex-timer-lbl">Thời gian làm bài thi còn lại</p>
                <div className="tti-ex-timer">{fmtHMS(remainingExam)}</div>
              </div>

              <div className="tti-pb">
                <div className="tti-pb-row tti-pb-row--end-only">
                  <div className="tti-pb-e">
                    <small>Kết thúc buổi thi</small>
                    <span>{endClock}</span>
                  </div>
                </div>
                <ThiThuExamProgressBar
                  cfg={cfg}
                  durationPhut={examPhut}
                  progress={progress}
                  breakMarkerPct={breakMarkerPct}
                  breakRangeLabel={breakRangeLabel}
                  showBreakAbove={showBreakMarker}
                  onTerminalClick={() => setSubmitOpen(true)}
                />
              </div>

              <div className="tti-de-sec">
                <div className="tti-de-sec-ttl">
                  <div className="tti-de-ttl-bar" />
                  Đề thi
                </div>
                <ThiThuExamDeAccordion items={deThiItems} />
              </div>
            </div>

            {showExamGradingTicker && examGradingTickerText ? (
              <div
                className={`tti-exam-ticker${reduceMotion ? " tti-exam-ticker--static" : ""}`}
                role="region"
                aria-label="Nhắc lịch chấm bài"
              >
                {reduceMotion ? (
                  <p className="tti-exam-ticker-static-txt">{examGradingTickerText}</p>
                ) : (
                  <div className="tti-exam-ticker-inner">
                    <div className="tti-exam-ticker-track">
                      <span className="tti-exam-ticker-seg">
                        {examGradingTickerText}
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                      </span>
                      <span className="tti-exam-ticker-seg" aria-hidden>
                        {examGradingTickerText}
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        ) : phase === "break" && GLs != null && GLe != null ? (
          <motion.section
            key="break"
            className="tti-break-wrap"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -16 }}
            transition={tBreak}
          >
            <Image src={LOGO_SRC} alt="" width={140} height={56} className="mb-6 h-12 w-auto opacity-90" />
            <h2 className="font-[family-name:var(--font-be-vietnam-pro)] text-2xl font-bold text-[#2d2020]">
              Kết thúc buổi thi đợt 1
            </h2>
            <p className="mt-4 max-w-md text-sm text-[rgba(45,32,32,0.55)]">
              Hẹn bạn lại lúc{" "}
              {new Date(GLe).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="tti-cd-timer mt-6">{fmtMMSS(Math.max(0, GLe - now))}</p>
            {ky.lich_cham_bai_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ky.lich_cham_bai_url}
                alt="Lịch chấm bài"
                className="mt-8 max-h-80 w-full max-w-md rounded-2xl object-contain shadow-md"
              />
            ) : null}
            <Link href="/thi-thu" className="tti-cd-back mt-10">
              ← Danh sách kỳ thi
            </Link>
          </motion.section>
        ) : isGradingVideoSession ? (
          <motion.section
            key="sua-bai-session"
            className="tti-sua-wrap relative"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tEnded}
          >
            <div className="tti-ended-orb-a" aria-hidden />
            <div className="tti-ended-orb-b" aria-hidden />
            <h2 className="tti-sua-h">
              {suaSessionExamDayLabel ? (
                <>Video sửa bài thi thử ngày {suaSessionExamDayLabel}</>
              ) : (
                <>Video sửa bài thi thử</>
              )}
            </h2>
            <div className="tti-sua-vid-frame">
              <iframe
                title="Video sửa bài thi thử Sine Art"
                src={youtubeEmbedSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <Link href="/thi-thu" className="tti-ended-back">
              ← Về danh sách kỳ thi
            </Link>
          </motion.section>
        ) : phase === "ended" ? (
          <motion.section
            key="ended"
            className="tti-ended-wrap relative"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={tEnded}
          >
            <div className="tti-ended-orb-a" aria-hidden />
            <div className="tti-ended-orb-b" aria-hidden />
            <div className="tti-ended-check">
              <svg viewBox="0 0 28 28" width={28} height={28} aria-hidden>
                <polyline
                  points="5,14 11,20 23,8"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="tti-ended-h">Kết thúc buổi thi</h2>
            {endedChamTimeLabel ? (
              <p className="tti-ended-cham">
                <span className="tti-ended-cham-k">Thời gian chấm / phát video sửa bài</span>
                <span className="tti-ended-cham-v">{endedChamTimeLabel}</span>
              </p>
            ) : null}
            <p className="tti-ended-s">
              Cảm ơn các sĩ tử đã tham gia kỳ thi!
              <br />
              Đừng quên theo dõi lịch chấm / live chữa bài bên dưới nhé.
            </p>
            {ky.lich_cham_bai_url ? (
              <div className="tti-ended-card">
                <p className="tti-ended-card-tag">LỊCH CHẤM / LIVE CHỮA BÀI</p>
                <div className="tti-ended-card-ph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ky.lich_cham_bai_url} alt="Lịch chấm bài" className="h-full w-full object-contain" />
                </div>
              </div>
            ) : null}
            <Link href="/thi-thu" className="tti-ended-back">
              ← Về danh sách kỳ thi
            </Link>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <ThiThuSubmitModal kyId={id} open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}
