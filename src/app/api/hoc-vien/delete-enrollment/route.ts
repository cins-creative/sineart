import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function calcDaysRemaining(d: string | null): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - today.getTime()) / 86400000);
}

function hpDonStatus(emb: unknown): string | null {
  if (emb == null) return null;
  if (Array.isArray(emb)) {
    const x = emb[0];
    if (x && typeof x === "object" && "status" in x) {
      const s = (x as { status: unknown }).status;
      return s != null ? String(s) : null;
    }
    return null;
  }
  if (typeof emb === "object" && "status" in emb) {
    const s = (emb as { status: unknown }).status;
    return s != null ? String(s) : null;
  }
  return null;
}

async function ngayKetThucHocPhiForEnrollment(
  sb: SupabaseClient,
  enrollmentId: number
): Promise<string | null> {
  let ngayKetThuc: string | null = null;
  try {
    const { data: hpRowsRaw, error: hpErr } = await sb
      .from("hp_thu_hp_chi_tiet")
      .select("ngay_cuoi_ky, hp_don_thu_hoc_phi(status)")
      .eq("khoa_hoc_vien", enrollmentId)
      .order("ngay_cuoi_ky", { ascending: false });

    if (!hpErr && hpRowsRaw?.length) {
      const hpRows = hpRowsRaw as { ngay_cuoi_ky: string | null; hp_don_thu_hoc_phi: unknown }[];
      const paidRow = hpRows.find((hp) => hpDonStatus(hp.hp_don_thu_hoc_phi) === "Đã thanh toán");
      ngayKetThuc = paidRow?.ngay_cuoi_ky ?? hpRows[0]?.ngay_cuoi_ky ?? null;
    } else {
      const { data: simpleHp } = await sb
        .from("hp_thu_hp_chi_tiet")
        .select("ngay_cuoi_ky")
        .eq("khoa_hoc_vien", enrollmentId)
        .order("ngay_cuoi_ky", { ascending: false })
        .limit(1);
      ngayKetThuc = (simpleHp?.[0] as { ngay_cuoi_ky?: string } | undefined)?.ngay_cuoi_ky ?? null;
    }
  } catch {
    ngayKetThuc = null;
  }
  const s = ngayKetThuc != null ? String(ngayKetThuc).trim().slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function emailsMatchHv(row: { email?: unknown }, providedClean: string): boolean {
  const fromRow = String(row.email ?? "").trim().toLowerCase();
  return fromRow !== "" && fromRow === providedClean;
}

/**
 * Xóa một dòng `ql_quan_ly_hoc_vien` khi học viên xác nhận trên trang cá nhân.
 * Body: `{ qlhv_id, hoc_vien_id, email, acknowledge_active_enrollment?: boolean }`
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: {
    qlhv_id?: unknown;
    hoc_vien_id?: unknown;
    email?: unknown;
    acknowledge_active_enrollment?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const qlhvId = Number(body.qlhv_id);
  const hocVienId = Number(body.hoc_vien_id);
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const emailClean = emailRaw.toLowerCase();
  const acknowledge = body.acknowledge_active_enrollment === true;

  if (!Number.isFinite(qlhvId) || qlhvId <= 0 || !Number.isFinite(hocVienId) || hocVienId <= 0) {
    return NextResponse.json(
      { ok: false, error: "qlhv_id / hoc_vien_id không hợp lệ.", code: "BAD_IDS" },
      { status: 400 }
    );
  }
  if (!emailClean) {
    return NextResponse.json({ ok: false, error: "Thiếu email xác thực.", code: "BAD_EMAIL" }, { status: 400 });
  }

  const { data: hvRow, error: hvErr } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("id, email")
    .eq("id", hocVienId)
    .maybeSingle();

  if (hvErr || !hvRow) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy học viên.", code: "NO_HV" }, { status: 403 });
  }
  if (!emailsMatchHv(hvRow as { email?: unknown }, emailClean)) {
    return NextResponse.json({ ok: false, error: "Email không khớp hồ sơ.", code: "EMAIL_MISMATCH" }, { status: 403 });
  }

  const { data: enRow, error: enErr } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, lop_hoc")
    .eq("id", qlhvId)
    .maybeSingle();

  if (enErr || !enRow) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy ghi danh.", code: "NO_ENROLLMENT" }, { status: 404 });
  }

  const enHv = Number((enRow as { hoc_vien_id?: unknown }).hoc_vien_id);
  if (!Number.isFinite(enHv) || enHv !== hocVienId) {
    return NextResponse.json({ ok: false, error: "Ghi danh không thuộc học viên này.", code: "HV_MISMATCH" }, { status: 403 });
  }

  const ngayKt = await ngayKetThucHocPhiForEnrollment(sb, qlhvId);
  const days = calcDaysRemaining(ngayKt);
  if (days !== null && days > 0 && !acknowledge) {
    return NextResponse.json(
      {
        ok: false,
        code: "NEED_ACK",
        days_remaining: days,
        message: `Bạn còn ${days} ngày trong kỳ học phí hiện tại.`,
      },
      { status: 409 }
    );
  }

  const lopHocId = Number((enRow as { lop_hoc?: unknown }).lop_hoc);
  if (Number.isFinite(lopHocId) && lopHocId > 0) {
    let { error: chatErr } = await sb.from("hv_chatbox").delete().eq("name", qlhvId).eq("lop_hoc", lopHocId);
    if (chatErr) {
      ({ error: chatErr } = await sb.from("hv_chatbox").delete().eq("name", qlhvId).eq("class", lopHocId));
    }
  }

  const { error: hpDelErr } = await sb.from("hp_thu_hp_chi_tiet").delete().eq("khoa_hoc_vien", qlhvId);
  if (hpDelErr) {
    return NextResponse.json(
      { ok: false, error: hpDelErr.message || "Không xóa được dòng học phí liên quan.", code: "HP_DELETE" },
      { status: 500 }
    );
  }

  const { error: qlDelErr } = await sb.from("ql_quan_ly_hoc_vien").delete().eq("id", qlhvId);
  if (qlDelErr) {
    return NextResponse.json(
      { ok: false, error: qlDelErr.message || "Không xóa được ghi danh.", code: "QLHV_DELETE" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
