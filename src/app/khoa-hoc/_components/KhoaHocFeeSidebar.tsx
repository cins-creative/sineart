"use client";

import type { GoiHocPhi } from "@/types/khoa-hoc";
import { useMemo, useState } from "react";

function formatVnd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function buildOptionKey(g: GoiHocPhi): string {
  const numberPart = g.numberValue == null ? "na" : String(g.numberValue);
  const unitPart = (g.donVi ?? "na").trim().toLowerCase();
  return `${numberPart}-${unitPart}-${g.id}`;
}

function removeAccent(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function normalizeHtToWidget(v: string | null | undefined): "Online" | "Offline" | null {
  const s = removeAccent(String(v ?? ""));
  if (!s) return null;
  if (s === "online") return "Online";
  if (s === "offline" || s.includes("tai lop") || s.includes("trung tam")) return "Offline";
  return null;
}

function getLabel1Mon(monName: string): string {
  return `Chỉ học ${monName.trim()}`;
}

function getLabel2Mon(monName: string): string {
  const u = removeAccent(monName);
  if (u.includes("hinh hoa")) return "Học 2 môn (combo với TTM hoặc BCM)";
  return "Học 2 môn (combo cùng Hình họa)";
}

function matchGoi(
  gois: GoiHocPhi[],
  opts: { soMon: 1 | 2; selectedKey: string | null; hinhThuc: "Online" | "Offline" }
): GoiHocPhi | null {
  return (
    gois.find((g) => {
      if (g.laChuanThi === true) return false;
      if (Number(g.soMon ?? 0) !== opts.soMon) return false;
      if (buildOptionKey(g) !== opts.selectedKey) return false;
      const ht = normalizeHtToWidget(g.hinhThuc);
      if (ht && ht !== opts.hinhThuc) return false;
      return true;
    }) ?? null
  );
}

function priceLabel(g: GoiHocPhi): {
  main: string;
  strike?: string;
  pct?: number;
} {
  const giaGoc = Number(g.giaGoc ?? 0);
  const pct = Number(g.discount ?? 0);
  const thucDong = Number(g.hocPhiThucDong ?? 0);
  if (thucDong > 0 && giaGoc > thucDong && pct > 0) {
    return { main: formatVnd(thucDong), strike: formatVnd(giaGoc), pct };
  }
  if (thucDong > 0) return { main: formatVnd(thucDong) };
  if (giaGoc > 0) return { main: formatVnd(giaGoc) };
  return { main: "Liên hệ" };
}

/**
 * Widget học phí — UI + logic theo `goi-hoc-phi-widget.html`.
 * Môn học & hình thức: lấy theo lớp/route hiện tại (dynamic), không fetch thêm.
 */
export default function KhoaHocFeeSidebar({
  monHocName,
  initialHinhThuc,
  goiHocPhi,
}: {
  monHocName: string;
  initialHinhThuc: "Online" | "Offline";
  goiHocPhi: GoiHocPhi[];
}) {
  const gois = useMemo(() => goiHocPhi ?? [], [goiHocPhi]);
  const gois1Mon = useMemo(() => gois.filter((g) => Number(g.soMon ?? 0) === 1), [gois]);
  const gois2Mon = useMemo(() => gois.filter((g) => Number(g.soMon ?? 0) === 2), [gois]);
  const has2Mon = useMemo(() => gois.some((g) => Number(g.soMon) === 2), [gois]);
  const hasOnline = useMemo(
    () => gois.some((g) => normalizeHtToWidget(g.hinhThuc) === "Online"),
    [gois]
  );
  const hasOffline = useMemo(
    () => gois.some((g) => normalizeHtToWidget(g.hinhThuc) === "Offline"),
    [gois]
  );

  const showHtSelect = hasOnline && hasOffline;
  const resolvedInitialHt: "Online" | "Offline" = showHtSelect
    ? initialHinhThuc
    : hasOnline
      ? "Online"
      : "Offline";

  const [hinhThuc, setHinhThuc] = useState<"Online" | "Offline">(resolvedInitialHt);
  const [selected1, setSelected1] = useState<string | null>(
    gois1Mon.length ? buildOptionKey(gois1Mon[0]!) : null
  );
  const [selected2, setSelected2] = useState<string | null>(
    gois2Mon.length ? buildOptionKey(gois2Mon[0]!) : null
  );
  const [feeBlock, setFeeBlock] = useState<1 | 2>(1);

  const activeGoi = useMemo(() => {
    if (!gois.length) return null;
    if (feeBlock === 1) {
      return matchGoi(gois, { soMon: 1, selectedKey: selected1, hinhThuc });
    }
    if (feeBlock === 2 && selected2) {
      return matchGoi(gois, { soMon: 2, selectedKey: selected2, hinhThuc });
    }
    return null;
  }, [gois, feeBlock, selected1, selected2, hinhThuc]);

  const pl = useMemo(() => {
    if (!activeGoi) return { main: gois.length ? "Liên hệ" : "—" };
    return priceLabel(activeGoi);
  }, [activeGoi, gois.length]);

  return (
    <section className="kd-goi-widget" aria-label="Gói học phí">
      <div className="kd-goi-price-card">
        <div className="kd-goi-top">
          <div className="kd-goi-field">
            <div className="kd-goi-section-label">Môn học</div>
            <select className="kd-goi-select" value={monHocName} disabled aria-label="Môn học">
              <option value={monHocName}>{monHocName}</option>
            </select>
          </div>
          {showHtSelect ? (
            <div className="kd-goi-field">
              <div className="kd-goi-section-label">Hình thức</div>
              <select
                className="kd-goi-select"
                value={hinhThuc}
                onChange={(e) => {
                  const v = e.target.value === "Online" ? "Online" : "Offline";
                  setHinhThuc(v);
                  setSelected1(gois1Mon.length ? buildOptionKey(gois1Mon[0]!) : null);
                  setSelected2(gois2Mon.length ? buildOptionKey(gois2Mon[0]!) : null);
                  setFeeBlock(1);
                }}
              >
                <option value="Online">Online</option>
                <option value="Offline">Tại lớp</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="kd-goi-tiny">Học phí</div>
        <div className="kd-goi-price-row">
          <span className="kd-goi-price-main">{pl.main}</span>
          {"strike" in pl && pl.strike ? (
            <span className="kd-goi-price-strike">{pl.strike}</span>
          ) : null}
          {"pct" in pl && typeof pl.pct === "number" && pl.pct > 0 ? (
            <span className="kd-goi-price-badge">Giảm {Math.round(pl.pct)}%</span>
          ) : null}
        </div>
        {activeGoi?.tenGoiHocPhi ? (
          <div className="kd-goi-price-name">{activeGoi.tenGoiHocPhi}</div>
        ) : null}
      </div>

      <div className="kd-goi-pill-section">
        <div className="kd-goi-pill-group">
          <div className="kd-goi-group-label">{getLabel1Mon(monHocName)}</div>
          <div className="kd-goi-pill-row" role="group" aria-label="Thời lượng 1 môn">
            {gois1Mon.map((g) => {
              const key = buildOptionKey(g);
              const active = feeBlock === 1 && selected1 === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? "kd-goi-pill kd-goi-pill--active" : "kd-goi-pill"}
                  aria-pressed={active}
                  onClick={() => {
                    setFeeBlock(1);
                    setSelected1(key);
                  }}
                >
                  {`${g.numberValue ?? "?"} ${g.donVi ?? ""}`.trim()}
                </button>
              );
            })}
          </div>
        </div>

        {has2Mon ? (
          <div className="kd-goi-pill-group">
            <div className="kd-goi-group-label">{getLabel2Mon(monHocName)}</div>
            <div className="kd-goi-pill-row" role="group" aria-label="Thời lượng 2 môn">
              {gois2Mon.map((g) => {
                const key = buildOptionKey(g);
                const active = feeBlock === 2 && selected2 === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={active ? "kd-goi-pill kd-goi-pill--active" : "kd-goi-pill"}
                    aria-pressed={active}
                    onClick={() => {
                      if (feeBlock === 2 && selected2 === key) {
                        setFeeBlock(1);
                        return;
                      }
                      setSelected2(key);
                      setFeeBlock(2);
                    }}
                  >
                    {`${g.numberValue ?? "?"} ${g.donVi ?? ""}`.trim()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <a href="/donghocphi" className="kd-goi-link">
        Đăng ký / đóng học phí →
      </a>
    </section>
  );
}
