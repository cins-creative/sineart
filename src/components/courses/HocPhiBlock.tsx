"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import type {
  HocPhiBlockData,
  HocPhiComboRow,
  HocPhiGoiRow,
} from "@/types/khoa-hoc";
import {
  dedupeMon1Pills,
  durationKey,
  isHocPhiCapTocSpecial,
  sameDur,
} from "@/lib/hocPhiDedupe";
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
    setSelGoi(mon1Pills[0] ?? null);
    setSelPartners(new Set());
    setPartnerDur({});
  }, [monHocId, mon1Pills, expressMode]);

  const partnerMonIds = useMemo(
    () =>
      [
        ...new Set(
          gois
            .filter(
              (r) =>
                r.combo_id != null &&
                r.mon_hoc !== monHocId &&
                gois.some(
                  (g) =>
                    g.mon_hoc === monHocId && g.combo_id === r.combo_id,
                ),
            )
            .map((r) => r.mon_hoc),
        ),
      ],
    [gois, monHocId],
  );

  const activeCombo: HocPhiComboRow | null = useMemo(() => {
    if (!selGoi || selPartners.size === 0) return null;
    const allMons = [monHocId, ...Array.from(selPartners)];
    return (
      combos.find((combo) => {
        return allMons.every((mid) => {
          const dur =
            mid === monHocId
              ? { number: selGoi.number, don_vi: selGoi.don_vi }
              : partnerDur[mid] ?? {
                  number: selGoi.number,
                  don_vi: selGoi.don_vi,
                };
          const dvt = dur.don_vi.trim();
          return gois.some(
            (r) =>
              r.mon_hoc === mid &&
              r.combo_id === combo.id &&
              r.number === dur.number &&
              r.don_vi.trim() === dvt
          );
        });
      }) ?? null
    );
  }, [selGoi, selPartners, partnerDur, gois, combos, monHocId]);

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

  const price1 = selGoi ? calc(selGoi.gia_goc, selGoi.discount) : 0;
  let partnerSum = 0;
  let origPartnerSum = 0;
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

  const comboSaving = activeCombo ? activeCombo.gia_giam : 0;
  const total = price1 + partnerSum - comboSaving;
  const origTotal = (selGoi?.gia_goc ?? 0) + origPartnerSum;
  const saved = origTotal - total;

  const mainName =
    monMap[monHocId]?.trim() || `Môn ${monHocId}`;

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
        {selPartners.size === 0 && selGoi && selGoi.discount > 0 ? (
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

      <a href="/donghocphi" className="hpb-link kd-goi-link">
        Đăng ký / đóng học phí →
      </a>
    </section>
  );
}
