import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import type { SupabaseClient } from "@supabase/supabase-js";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function formatViDateFromIso(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const s = String(raw).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m, d).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }
  return s;
}

function discountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PaymentReceiptLine = {
  label: string;
  packageLabel: string;
  amountDong: number;
  periodFrom: string;
  periodTo: string;
};

export function buildPaymentReceiptEmailHtml(params: {
  studentName: string;
  maDonSo: string;
  maDon: string | null;
  donId: number;
  ngayThanhToan: string | null;
  totalDong: number;
  lines: PaymentReceiptLine[];
  /** Base URL không dấu / cuối — CTA «Vào khóa học» */
  siteBaseUrl: string;
}): string {
  const { studentName, maDonSo, maDon, donId, ngayThanhToan, totalDong, lines, siteBaseUrl } =
    params;
  const khoaHocUrl = `${siteBaseUrl}/khoa-hoc`;
  const rowsHtml = lines
    .map(
      (ln) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid rgba(45,32,32,0.08);font-size:14px;color:#2d2020;font-weight:600;">${escapeHtml(ln.label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid rgba(45,32,32,0.08);font-size:13px;color:rgba(45,32,32,0.56);">${escapeHtml(ln.packageLabel)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid rgba(45,32,32,0.08);font-size:13px;color:rgba(45,32,32,0.56);white-space:nowrap;">${escapeHtml(ln.periodFrom)} → ${escapeHtml(ln.periodTo)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid rgba(45,32,32,0.08);font-size:14px;color:#2d2020;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(formatVnd(ln.amountDong))}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Biên nhận thanh toán — Sine Art</title>
</head>
<body style="margin:0;padding:0;background:#fff8f6;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8f6;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,32,32,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f8a668 0%,#ee5b9f 100%);padding:22px 28px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.9);">Sine Art</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Xác nhận thanh toán học phí</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#2d2020;">
                Xin chào <strong>${escapeHtml(studentName)}</strong>,<br />
                Cảm ơn bạn đã hoàn tất thanh toán. Dưới đây là thông tin giao dịch và các khóa liên quan.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(45,32,32,0.1);border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 18px;background:rgba(187,137,248,0.08);border-bottom:1px solid rgba(45,32,32,0.08);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(45,32,32,0.56);">Thông tin đơn</td>
                </tr>
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#2d2020;">
                      <tr><td style="padding:6px 0;color:rgba(45,32,32,0.56);width:42%;">Mã nội dung CK</td><td style="padding:6px 0;font-weight:700;color:#bb89f8;">${escapeHtml(maDonSo)}</td></tr>
                      ${maDon ? `<tr><td style="padding:6px 0;color:rgba(45,32,32,0.56);">Mã đơn hệ thống</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(maDon)}</td></tr>` : ""}
                      <tr><td style="padding:6px 0;color:rgba(45,32,32,0.56);">Mã đơn (#id)</td><td style="padding:6px 0;font-weight:600;">#${donId}</td></tr>
                      <tr><td style="padding:6px 0;color:rgba(45,32,32,0.56);">Ngày thanh toán</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(formatViDateFromIso(ngayThanhToan))}</td></tr>
                      <tr><td style="padding:6px 0;color:rgba(45,32,32,0.56);">Tổng thanh toán</td><td style="padding:6px 0;font-weight:800;font-size:16px;color:#ee5b9f;">${escapeHtml(formatVnd(totalDong))}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(45,32,32,0.56);">Chi tiết theo khóa</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(45,32,32,0.1);border-radius:12px;overflow:hidden;">
                <thead>
                  <tr style="background:rgba(110,254,192,0.2);">
                    <th align="left" style="padding:10px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#2d2020;">Khóa học</th>
                    <th align="left" style="padding:10px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#2d2020;">Gói</th>
                    <th align="left" style="padding:10px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#2d2020;">Kỳ (dự kiến)</th>
                    <th align="right" style="padding:10px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#2d2020;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <p style="margin:0;padding:14px 16px;background:rgba(248,166,104,0.18);border-left:4px solid #f8a668;border-radius:8px;font-size:13px;line-height:1.5;color:#2d2020;">
                <strong>Lưu ý:</strong> Ngày kỳ học phí hiển thị là dự kiến theo gói tại thời điểm thanh toán; hồ sơ học viên sẽ được cập nhật chính xác trên hệ thống.
                Liên hệ Sine Art để hỗ trợ cập nhật thông tin nếu cần.
              </p>
              <p style="margin:18px 0 0;text-align:center;">
                <a href="${escapeHtml(khoaHocUrl)}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#ffffff !important;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;">Vào danh sách khóa học</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:rgba(187,137,248,0.06);border-top:1px solid rgba(45,32,32,0.08);text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(45,32,32,0.5);line-height:1.5;">
                Sine Art · ${escapeHtml(siteBaseUrl.replace(/^https?:\/\//, ""))}<br />
                Email tự động — vui lòng không trả lời trực tiếp thư này nếu không cần thiết.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type PaymentReceiptSendResult =
  | { sent: true }
  | { sent: false; reason: string; hint?: string };

/**
 * Gửi email biên nhận qua Resend (REST). Cần `RESEND_API_KEY` trên server.
 * `RESEND_FROM` — ví dụ `Sine Art <noreply@sineart.vn>` (domain phải verify trên Resend).
 */
export async function sendPaymentReceiptEmail(
  supabase: SupabaseClient,
  donId: number
): Promise<PaymentReceiptSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "no_resend_key" };
  }

  function parseResendErrorBody(errText: string): string {
    const raw = errText.trim().slice(0, 400);
    try {
      const j = JSON.parse(errText) as { message?: string };
      const m = String(j.message ?? "").trim();
      return (m || raw).slice(0, 220);
    } catch {
      return raw.slice(0, 180);
    }
  }

  const fromRaw =
    process.env.RESEND_FROM?.trim() || "Sine Art <onboarding@resend.dev>";

  const { data: don, error: donErr } = await supabase
    .from("hp_don_thu_hoc_phi")
    .select("student, ma_don_so, ma_don, ngay_thanh_toan, giam_gia")
    .eq("id", donId)
    .maybeSingle();

  if (donErr || !don) {
    return { sent: false, reason: "don_read" };
  }

  const dr = don as {
    student?: unknown;
    ma_don_so?: string | null;
    ma_don?: string | null;
    ngay_thanh_toan?: string | null;
    giam_gia?: unknown;
  };

  const studentId = Number(dr.student);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return { sent: false, reason: "no_student" };
  }

  const { data: hv, error: hvErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("full_name, email")
    .eq("id", studentId)
    .maybeSingle();

  if (hvErr || !hv) {
    return { sent: false, reason: "hv_read" };
  }

  const hvr = hv as { full_name?: string | null; email?: string | null };
  const toEmail = String(hvr.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return { sent: false, reason: "bad_email" };
  }

  const studentName = String(hvr.full_name ?? "").trim() || "Học viên";
  const maDonSo = String(dr.ma_don_so ?? "").trim() || `Đơn #${donId}`;
  const maDon = dr.ma_don != null && String(dr.ma_don).trim() !== "" ? String(dr.ma_don).trim() : null;
  const ngayThanhToan =
    dr.ngay_thanh_toan != null ? String(dr.ngay_thanh_toan) : null;
  const giamGia = parseMoney(dr.giam_gia);

  const { data: chiRows, error: chiErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky")
    .eq("don_thu", donId);

  if (chiErr || !chiRows?.length) {
    return { sent: false, reason: "chi_read" };
  }

  const goiTable = hpGoiHocPhiTableName();
  const qlIds = [
    ...new Set(
      chiRows
        .map((r) => Number((r as { khoa_hoc_vien?: unknown }).khoa_hoc_vien))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  const qlById = new Map<number, number>();
  if (qlIds.length > 0) {
    const { data: qlRows } = await supabase
      .from("ql_quan_ly_hoc_vien")
      .select("id, lop_hoc")
      .in("id", qlIds);
    for (const q of qlRows ?? []) {
      const row = q as { id?: unknown; lop_hoc?: unknown };
      const qid = Number(row.id);
      const lid = Number(row.lop_hoc);
      if (Number.isFinite(qid) && Number.isFinite(lid)) qlById.set(qid, lid);
    }
  }

  const lopIds = [...new Set(qlById.values())];
  const lopById = new Map<number, { class_name: string; mon_hoc: number }>();
  if (lopIds.length > 0) {
    const { data: lopRows } = await supabase
      .from("ql_lop_hoc")
      .select("id, class_name, mon_hoc")
      .in("id", lopIds);
    for (const l of lopRows ?? []) {
      const row = l as { id?: unknown; class_name?: unknown; mon_hoc?: unknown };
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      lopById.set(id, {
        class_name: String(row.class_name ?? "").trim() || `Lớp ${id}`,
        mon_hoc: Number(row.mon_hoc) || 0,
      });
    }
  }

  const monIds = [...new Set([...lopById.values()].map((x) => x.mon_hoc).filter((m) => m > 0))];
  const monName = new Map<number, string>();
  if (monIds.length > 0) {
    const { data: monRows } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", monIds);
    for (const m of monRows ?? []) {
      const row = m as { id?: unknown; ten_mon_hoc?: unknown };
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      monName.set(id, String(row.ten_mon_hoc ?? "").trim() || `Môn ${id}`);
    }
  }

  const goiIds = [
    ...new Set(
      chiRows
        .map((raw) => Number((raw as { goi_hoc_phi?: unknown }).goi_hoc_phi))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  const goiById = new Map<
    number,
    { number: unknown; don_vi: unknown; gia_goc: unknown; discount: unknown }
  >();
  if (goiIds.length > 0) {
    const { data: goiRows } = await supabase
      .from(goiTable)
      .select('id, "number", don_vi, gia_goc, discount')
      .in("id", goiIds);
    for (const g of goiRows ?? []) {
      const row = g as {
        id?: unknown;
        number?: unknown;
        don_vi?: unknown;
        gia_goc?: unknown;
        discount?: unknown;
      };
      const gid = Number(row.id);
      if (!Number.isFinite(gid)) continue;
      goiById.set(gid, {
        number: row.number,
        don_vi: row.don_vi,
        gia_goc: row.gia_goc,
        discount: row.discount,
      });
    }
  }

  const lines: PaymentReceiptLine[] = [];
  let subtotal = 0;

  for (const raw of chiRows) {
    const r = raw as {
      khoa_hoc_vien?: unknown;
      goi_hoc_phi?: unknown;
      ngay_dau_ky?: string | null;
      ngay_cuoi_ky?: string | null;
    };
    const qlId = Number(r.khoa_hoc_vien);
    const goiId = Number(r.goi_hoc_phi);
    if (!Number.isFinite(goiId) || goiId <= 0) continue;

    const gr = goiById.get(goiId);
    if (!gr) continue;

    const giaGoc = parseMoney(gr?.gia_goc);
    const disc = parseMoney(gr?.discount);
    const payable = discountToPayable(giaGoc, disc);
    subtotal += payable;

    const num = gr?.number != null && gr.number !== "" ? Number(gr.number) : 0;
    const dv = String(gr?.don_vi ?? "").trim() || "tháng";
    const packageLabel =
      Number.isFinite(num) && num > 0 ? `${num} ${dv}` : "—";

    const lopId = qlById.get(qlId);
    const lop = lopId != null ? lopById.get(lopId) : undefined;
    const mon = lop?.mon_hoc ? monName.get(lop.mon_hoc) : undefined;
    const label =
      mon && lop
        ? `${mon} · ${lop.class_name}`
        : lop
          ? lop.class_name
          : `Ghi danh #${qlId}`;

    lines.push({
      label,
      packageLabel,
      amountDong: payable,
      periodFrom: formatViDateFromIso(r.ngay_dau_ky ?? null),
      periodTo: formatViDateFromIso(r.ngay_cuoi_ky ?? null),
    });
  }

  if (lines.length === 0) {
    return { sent: false, reason: "no_line_items" };
  }

  const totalDong = Math.max(0, Math.round(subtotal - giamGia));

  const siteBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : "https://sineart.vn");

  const html = buildPaymentReceiptEmailHtml({
    studentName,
    maDonSo,
    maDon,
    donId,
    ngayThanhToan,
    totalDong,
    lines,
    siteBaseUrl,
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `dhp-receipt-${donId}`,
      },
      body: JSON.stringify({
        from: fromRaw,
        to: [toEmail],
        subject: `[Sine Art] Đã nhận thanh toán — ${maDonSo}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const hint = parseResendErrorBody(errText) || `HTTP ${res.status}`;
      return { sent: false, reason: "resend_api", hint };
    }

    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      sent: false,
      reason: "resend_network",
      hint: msg.trim().slice(0, 160) || "Lỗi mạng khi gọi Resend",
    };
  }
}
