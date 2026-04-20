"use client";

import { Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import type {
  HocPhiBlockData,
  HocPhiComboRow,
  HocPhiGoiRow,
} from "@/types/khoa-hoc";
import {
  dedupeMon1Pills,
  durationKey,
  groupMon1ByPostTitle,
  isHocPhiCapTocSpecial,
  sameDur,
} from "@/lib/hocPhiDedupe";
import { bestApplicableCombo } from "@/lib/donghocphi/combo-discount";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import "./hoc-phi-block.css";

function calc(giaGoc: number, disc: number): number {
  return Math.round((giaGoc * (100 - (disc || 0))) / 100);
}

function vnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}

/** Partner có gói tại thời lượng này (không bắt buộc khớp combo với môn chính). */
function hasPartnerPackageAtDuration(
  partnerMonId: number,
  number: number,
  donVi: string,
  gois: HocPhiGoiRow[]
): boolean {
  const dv = donVi.trim();
  return gois.some(
    (r) =>
      r.mon_hoc === partnerMonId &&
      r.number === number &&
      r.don_vi.trim() === dv,
  );
}

export default function HocPhiBlock({
  monHocId,
  data,
  /** Chỉ khi môn thuộc loại «Luyện thi» (theo `ql_mon_hoc.loai_khoa_hoc` trên trang khóa). */
  allowCapTocToggle = false,
}: {
  monHocId: number;
  data: HocPhiBlockData;
  allowCapTocToggle?: boolean;
}) {
  const { gois: goisAll, combos, monMap, monSlugMap } = data;

  const hasExpressPackages = useMemo(
    () => goisAll.some((r) => isHocPhiCapTocSpecial(r.special)),
    [goisAll],
  );

  const showCapTocToggle = allowCapTocToggle && hasExpressPackages;

  const [expressMode, setExpressMode] = useState(false);

  useEffect(() => {
    if (!showCapTocToggle) setExpressMode(false);
  }, [showCapTocToggle]);

  const gois = useMemo(() => {
    if (!allowCapTocToggle) {
      return goisAll.filter((r) => !isHocPhiCapTocSpecial(r.special));
    }
    if (expressMode) return goisAll.filter((r) => isHocPhiCapTocSpecial(r.special));
    return goisAll.filter((r) => !isHocPhiCapTocSpecial(r.special));
  }, [goisAll, expressMode, allowCapTocToggle]);

  const mon1Gois = useMemo(
    () => gois.filter((r) => r.mon_hoc === monHocId),
    [gois, monHocId],
  );

  // ── post_title grouping ─────────────────────────────────────────────────────
  const postTitleGroups = useMemo(
    () => groupMon1ByPostTitle(mon1Gois),
    [mon1Gois],
  );

  /**
   * Dùng post_title grouping khi có ít nhất một gói với post_title không rỗng.
   * Fallback về chế độ cũ (combo-partner) nếu tất cả post_title đều rỗng/null.
   */
  const usePostTitleGrouping = useMemo(
    () => postTitleGroups.some((g) => g.postTitle !== ""),
    [postTitleGroups],
  );
  // ────────────────────────────────────────────────────────────────────────────

  const mon1Pills = useMemo(
    () => dedupeMon1Pills(mon1Gois),
    [mon1Gois],
  );

  const [selGoi, setSelGoi] = useState<HocPhiGoiRow | null>(null);
  const [selPartners, setSelPartners] = useState<Set<number>>(new Set());
  /** Thời lượng đã chọn cho từng môn partner (độc lập với môn chính). */
  const [partnerDur, setPartnerDur] = useState<
    Record<number, { number: number; don_vi: string }>
  >({});

  useEffect(() => {
    if (usePostTitleGrouping) {
      // Chọn pill đầu tiên của nhóm đầu tiên (nhóm rỗng post_title hoặc nhóm đầu)
      setSelGoi(postTitleGroups[0]?.pills[0] ?? null);
    } else {
      setSelGoi(mon1Pills[0] ?? null);
    }
    setSelPartners(new Set());
    setPartnerDur({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, expressMode, usePostTitleGrouping]);

  /**
   * Partner môn ID = các môn khác môn chính xuất hiện trong `hp_combo_mon.goi_ids`
   * của combo đang hoạt động và chứa ít nhất 1 gói của môn chính.
   */
  const partnerMonIds = useMemo(() => {
    const mainGoiIds = new Set(
      gois.filter((g) => g.mon_hoc === monHocId).map((g) => g.id),
    );
    const result = new Set<number>();
    for (const combo of combos) {
      if (!combo.dang_hoat_dong) continue;
      if (!combo.goi_ids.some((id) => mainGoiIds.has(id))) continue;
      for (const gid of combo.goi_ids) {
        const g = gois.find((r) => r.id === gid);
        if (g && g.mon_hoc !== monHocId) result.add(g.mon_hoc);
      }
    }
    return [...result];
  }, [gois, combos, monHocId]);

  const activeCombo: HocPhiComboRow | null = useMemo(() => {
    if (usePostTitleGrouping) return null; // 2-môn price is baked into gia_goc
    if (!selGoi || selPartners.size === 0) return null;
    const cartIds = new Set<number>([selGoi.id]);
    for (const monId of selPartners) {
      const dur = partnerDur[monId] ?? {
        number: selGoi.number,
        don_vi: selGoi.don_vi,
      };
      const pg = gois.find(
        (r) =>
          r.mon_hoc === monId &&
          r.number === dur.number &&
          r.don_vi.trim() === dur.don_vi.trim(),
      );
      if (pg) cartIds.add(pg.id);
    }
    const lines = [...cartIds].map((id) => ({ goiId: id }));
    return bestApplicableCombo(lines, combos)?.combo ?? null;
  }, [selGoi, selPartners, partnerDur, gois, combos, monHocId, usePostTitleGrouping]);

  const headerRow = (
    <div className="hpb-goi-head">
      <div className="kd-goi-tiny">Học phí</div>
      {showCapTocToggle ? (
        <button
          type="button"
          className={cn("hpb-cap-toc", expressMode && "hpb-cap-toc--on")}
          aria-pressed={expressMode}
          title="Gói cấp tốc (theo cột special trên admin)"
          onClick={() => setExpressMode((v) => !v)}
        >
          <Flame className="hpb-cap-toc-flame" size={14} strokeWidth={2.2} aria-hidden />
          <span>Cấp tốc</span>
        </button>
      ) : null}
    </div>
  );

  function handleSelectMon1(number: number, don_vi: string) {
    const dv = don_vi.trim();
    const goi =
      gois.find(
        (r) =>
          r.mon_hoc === monHocId &&
          r.number === number &&
          r.don_vi.trim() === dv
      ) ?? null;
    setSelGoi(goi);
    setSelPartners(new Set());
    setPartnerDur({});
  }

  function togglePartner(partnerMonId: number) {
    const next = new Set(selPartners);
    if (next.has(partnerMonId)) {
      next.delete(partnerMonId);
    } else {
      next.add(partnerMonId);
    }
    setSelPartners(next);
    if (!next.has(partnerMonId)) {
      setPartnerDur((prev) => {
        const { [partnerMonId]: _, ...rest } = prev;
        return rest;
      });
    }
  }

  // ── Tính giá ────────────────────────────────────────────────────────────────
  const price1 = selGoi ? calc(selGoi.gia_goc, selGoi.discount) : 0;

  let partnerSum = 0;
  let origPartnerSum = 0;
  if (!usePostTitleGrouping) {
    Array.from(selPartners).forEach((monId) => {
      if (!selGoi) return;
      const dur = partnerDur[monId] ?? {
        number: selGoi.number,
        don_vi: selGoi.don_vi,
      };
      const pg = gois.find(
        (r) =>
          r.mon_hoc === monId &&
          r.number === dur.number &&
          r.don_vi.trim() === dur.don_vi.trim()
      );
      if (pg) {
        partnerSum += calc(pg.gia_goc, pg.discount);
        origPartnerSum += pg.gia_goc;
      }
    });
  }

  const comboSaving = activeCombo ? activeCombo.gia_giam : 0;
  const total = usePostTitleGrouping
    ? price1
    : price1 + partnerSum - comboSaving;
  const origTotal = usePostTitleGrouping
    ? (selGoi?.gia_goc ?? 0)
    : (selGoi?.gia_goc ?? 0) + origPartnerSum;
  const saved = origTotal - total;
  // ────────────────────────────────────────────────────────────────────────────

  const mainName = monMap[monHocId]?.trim() || `Môn ${monHocId}`;

  const selGoiNoteText = useMemo(() => {
    const raw = selGoi?.note;
    if (raw == null || typeof raw !== "string") return null;
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }, [selGoi]);

  if (!mon1Pills.length) {
    return (
      <section className="hpb-wrap kd-goi-widget" aria-label="Bảng học phí">
        {headerRow}
        <div className="hpb-state">
          {expressMode
            ? "Chưa có gói cấp tốc cho môn này (đặt special chứa «Cấp tốc» trên admin)."
            : "Chưa có gói học phí cho môn này."}
        </div>
        <a href="/donghocphi" className="hpb-link kd-goi-link">
          Đăng ký / đóng học phí →
        </a>
      </section>
    );
  }

  return (
    <section className="hpb-wrap kd-goi-widget" aria-label="Bảng học phí">
      {headerRow}
      <div className="hpb-price-wrap">
        <span className="hpb-price-main">
          {selGoi ? vnd(total) : "—"}
        </span>
        {origTotal > total ? (
          <span className="hpb-price-orig">{vnd(origTotal)}</span>
        ) : null}
        {!usePostTitleGrouping && selPartners.size === 0 && selGoi && selGoi.discount > 0 ? (
          <span className="hpb-badge hpb-badge--disc">
            -{Math.round(selGoi.discount)}%
          </span>
        ) : null}
        {usePostTitleGrouping && selGoi && selGoi.discount > 0 ? (
          <span className="hpb-badge hpb-badge--disc">
            -{Math.round(selGoi.discount)}%
          </span>
        ) : null}
        {saved > 0 ? (
          <span className="hpb-badge hpb-badge--save">
            tiết kiệm {vnd(saved)}
          </span>
        ) : null}
      </div>

      {selGoiNoteText ? (
        <div className="hpb-note-highlight" role="note">
          <Sparkles className="hpb-note-highlight-icon" size={16} strokeWidth={2} aria-hidden />
          <p className="hpb-note-highlight-text">{selGoiNoteText}</p>
        </div>
      ) : null}

      {usePostTitleGrouping ? (
        // ── Chế độ post_title grouping: mỗi post_title = 1 hàng ──────────────
        postTitleGroups.map((group) => (
          <div key={group.postTitle || "__default__"} className="hpb-row">
            <span className="hpb-row-label">
              {group.postTitle ? `${group.postTitle}:` : `Chỉ học ${mainName}:`}
            </span>
            <div
              className="hpb-pills"
              role="group"
              aria-label={group.postTitle || `Thời lượng ${mainName}`}
            >
              {group.pills.map((goi) => {
                const isActive = selGoi != null && selGoi.id === goi.id;
                return (
                  <button
                    key={`${group.postTitle}|${durationKey(goi)}`}
                    type="button"
                    className={isActive ? "hpb-pill hpb-pill--active" : "hpb-pill"}
                    aria-pressed={isActive}
                    onClick={() => {
                      setSelGoi(goi);
                      setSelPartners(new Set());
                      setPartnerDur({});
                    }}
                  >
                    {goi.number} {goi.don_vi}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        // ── Chế độ cũ: 1 hàng môn chính + hàng partner (combo) ───────────────
        <>
          <div className="hpb-row">
            <span className="hpb-row-label">Chỉ học {mainName}:</span>
            <div className="hpb-pills" role="group" aria-label="Thời lượng môn chính">
              {mon1Pills.map((goi) => {
                const isActive =
                  selGoi != null &&
                  goi.number === selGoi.number &&
                  goi.don_vi.trim() === selGoi.don_vi.trim();
                return (
                  <button
                    key={durationKey(goi)}
                    type="button"
                    className={
                      isActive ? "hpb-pill hpb-pill--active" : "hpb-pill"
                    }
                    aria-pressed={isActive}
                    onClick={() => handleSelectMon1(goi.number, goi.don_vi)}
                  >
                    {goi.number} {goi.don_vi}
                  </button>
                );
              })}
            </div>
          </div>

          {partnerMonIds.map((monId) => {
            const isSelected = selPartners.has(monId);
            const partnerLabel =
              monMap[monId]?.trim() || `Môn ${monId}`;
            const partnerSlug = monSlugMap[monId]?.trim();
            return (
              <div key={monId} className="hpb-row">
                {partnerSlug ? (
                  <Link
                    href={`/khoa-hoc/${partnerSlug}`}
                    className="hpb-row-label hpb-row-label--link"
                    title={`Xem trang khóa «${partnerLabel}»`}
                  >
                    + {partnerLabel}:
                  </Link>
                ) : (
                  <span className="hpb-row-label">+ {partnerLabel}:</span>
                )}
                <div className="hpb-pills" role="group" aria-label={`Gói ${partnerLabel}`}>
                  {mon1Pills.map((goi) => {
                    const hasPartner = hasPartnerPackageAtDuration(
                      monId,
                      goi.number,
                      goi.don_vi,
                      gois
                    );
                    const picked = partnerDur[monId];
                    const isActive =
                      isSelected &&
                      picked != null &&
                      sameDur(picked, goi);
                    return (
                      <button
                        key={`${monId}-${durationKey(goi)}`}
                        type="button"
                        disabled={!hasPartner}
                        className={
                          !hasPartner
                            ? "hpb-pill hpb-pill--disabled"
                            : isActive
                              ? "hpb-pill hpb-pill--active"
                              : "hpb-pill"
                        }
                        aria-pressed={isActive}
                        onClick={() => {
                          if (!hasPartner) return;
                          const cur = partnerDur[monId];
                          if (
                            isSelected &&
                            cur &&
                            sameDur(cur, goi)
                          ) {
                            togglePartner(monId);
                            return;
                          }
                          setPartnerDur((prev) => ({
                            ...prev,
                            [monId]: {
                              number: goi.number,
                              don_vi: goi.don_vi.trim(),
                            },
                          }));
                          setSelPartners((prev) => {
                            const next = new Set(prev);
                            next.add(monId);
                            return next;
                          });
                        }}
                      >
                        {goi.number} {goi.don_vi}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      <a href="/donghocphi" className="hpb-link kd-goi-link">
        Đăng ký / đóng học phí →
      </a>
    </section>
  );
}
