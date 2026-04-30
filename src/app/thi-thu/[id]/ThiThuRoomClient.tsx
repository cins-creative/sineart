"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ThiThuExamDeAccordion from "./ThiThuExamDeAccordion";
import ThiThuExamProgressBar from "./ThiThuExamProgressBar";
import ThiThuSubmitModal from "./ThiThuSubmitModal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { computeElapsedExamMs, computePhase } from "@/lib/thi-thu/phase";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuDeThiRow, ThiThuKyThiRow, ThiThuPhase } from "@/types/thi-thu";

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

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="white" width={26} height={26} aria-hidden>
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 14.5v-9l6 4.5-6 4.5z" />
    </svg>
  );
}

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

export default function ThiThuRoomClient({
  initialKy,
  initialDeThi,
  previewQuery,
  previewAllowed,
}: {
  initialKy: ThiThuKyThiRow;
  initialDeThi: ThiThuDeThiRow[];
  previewQuery: string | null;
  previewAllowed: boolean;
}) {
  const [ky, setKy] = useState(initialKy);
  const [deThiItems, setDeThiItems] = useState(initialDeThi);
  const [offsetMs, setOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);

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

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mon = ky.mon_thi as MonThiKey;
  const cfg = getMonConfig(mon);
  const T = new Date(ky.thoi_gian_bat_dau).getTime();
  const GLs = ky.thoi_gian_giai_lao_bat_dau
    ? new Date(ky.thoi_gian_giai_lao_bat_dau).getTime()
    : null;
  const GLe = ky.thoi_gian_giai_lao_ket_thuc
    ? new Date(ky.thoi_gian_giai_lao_ket_thuc).getTime()
    : null;
  const durMs = cfg.thoi_luong_phut * 60 * 1000;
  const endMs = T + durMs;

  const now = useMemo(() => {
    void nowTick;
    return Date.now() + offsetMs;
  }, [offsetMs, nowTick]);

  const phase: ThiThuPhase =
    forcedPhase ??
    computePhase({
      mon_thi: mon,
      T,
      GL_start: GLs,
      GL_end: GLe,
      now,
    });

  const elapsed = computeElapsedExamMs(phase, T, GLs, GLe, now);
  const progress = Math.min(1, elapsed / durMs);
  const breakMarkerPct =
    cfg.co_giai_lao && GLs != null ? (GLs - T) / durMs : null;
  const breakRangeLabel =
    GLs != null && GLe != null
      ? `${new Date(GLs).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – ${new Date(GLe).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : null;
  const showBreakMarker =
    cfg.co_giai_lao && GLs != null && (phase === "exam_1" || phase === "exam_2");
  const showNop = phase === "exam_1" || phase === "exam_2";

  const id = ky.id;

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

    const ch2 = supabase
      .channel(`thi-thu-de-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "thi_thu_de_thi",
          filter: `ky_thi_id=eq.${id}`,
        },
        () => {
          void supabase
            .from("thi_thu_de_thi")
            .select("id,ky_thi_id,tieu_de,anh_urls,thu_tu,created_at")
            .eq("ky_thi_id", id)
            .order("thu_tu", { ascending: true })
            .then(({ data }) => {
              if (data) setDeThiItems(data as ThiThuDeThiRow[]);
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch1);
      void supabase.removeChannel(ch2);
    };
  }, [id]);

  const countdownToOpen = Math.max(0, T - OPEN_MS - now);
  const countdownToStart = Math.max(0, T - now);
  const remainingExam = Math.max(0, endMs - now);

  const yearLabel = useMemo(() => new Date(T).getFullYear(), [T]);

  const endClock = new Date(endMs).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-[100dvh] min-[900px]:min-h-[calc(100dvh-76px)] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[#2d2020]">
      {forcedPhase ? (
        <div className="sticky top-0 z-[200] bg-amber-100 px-3 py-2 text-center text-xs font-bold text-amber-900">
          PREVIEW MODE — {forcedPhase}
        </div>
      ) : null}

      {phase === "waiting" ? (
        <section className="tti-wait-wrap px-6">
          <p className="text-sm font-semibold text-[rgba(45,32,32,0.55)]">Phòng thi chưa mở</p>
          <p className="mt-2 text-lg font-bold">Mở phòng sau:</p>
          <p className="tti-cd-timer mt-4">{fmtMMSS(countdownToOpen)}</p>
          <Link href="/thi-thu" className="tti-cd-back mt-8">
            ← Danh sách kỳ thi
          </Link>
        </section>
      ) : null}

      {phase === "countdown" ? (
        <section className="tti-cd-wrap">
          <div className="tti-cd-orb tti-cd-orb-a" aria-hidden />
          <div className="tti-cd-orb tti-cd-orb-b" aria-hidden />
          <div className="tti-cd-orb tti-cd-orb-c" aria-hidden />
          <div className="tti-cd-logo">
            <div className="tti-cd-logo-mark">
              <LogoMark />
            </div>
            <span className="tti-cd-logo-txt">
              Sine <b>Art</b>
            </span>
          </div>
          <p className="tti-cd-lbl">Đếm ngược trước khi bắt đầu thi</p>
          <div className="tti-cd-timer">{fmtMMSS(countdownToStart)}</div>
          <p className="tti-cd-sub">
            Phòng thi sẽ tự động mở — hãy chuẩn bị giấy, bút và dụng cụ vẽ
          </p>
          <Link href="/thi-thu" className="tti-cd-back">
            ← Danh sách kỳ thi
          </Link>
        </section>
      ) : null}

      {(phase === "exam_1" || phase === "exam_2") && (
        <div className="tti-ex-wrap">
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

            {showNop ? (
              <div className="tti-nop-wrap">
                <button type="button" className="tti-nop-btn" onClick={() => setSubmitOpen(true)}>
                  Nộp bài →
                </button>
                <p className="tti-nop-hint">Có thể nộp bài bất cứ lúc nào trong giờ làm bài</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {phase === "break" && GLs != null && GLe != null ? (
        <section className="tti-break-wrap">
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
        </section>
      ) : null}

      {phase === "ended" ? (
        <section className="tti-ended-wrap relative">
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
        </section>
      ) : null}

      <ThiThuSubmitModal kyId={id} open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}
