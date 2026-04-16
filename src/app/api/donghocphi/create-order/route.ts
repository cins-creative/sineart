import {
  createDongHocPhiOrder,
  type DhpNguyenVongPair,
} from "@/lib/donghocphi/create-order";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseNguyenVong(raw: unknown): DhpNguyenVongPair[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DhpNguyenVongPair[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const o = item as { truong_dai_hoc?: unknown; nganh_dao_tao?: unknown };
    const t = Number(o.truong_dai_hoc);
    const n = Number(o.nganh_dao_tao);
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(n) || n <= 0) continue;
    out.push({ truong_dai_hoc: t, nganh_dao_tao: n });
  }
  return out.length ? out : [];
}

type Body = {
  student?: {
    full_name?: string;
    sdt?: string;
    email?: string;
    sex?: string | null;
    nam_thi?: number | null;
    loai_khoa_hoc?: string | null;
    facebook?: string | null;
    avatar?: string | null;
    nguyen_vong?: unknown;
  };
  lines?: { lopId?: number; goiId?: number }[];
};

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên server.",
        code: "NO_SERVICE",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const st = body.student;
  if (!st) {
    return NextResponse.json({ error: "Thiếu student.", code: "BODY" }, { status: 400 });
  }

  const lines = (body.lines ?? [])
    .filter(
      (l): l is { lopId: number; goiId: number } =>
        l != null &&
        typeof l.lopId === "number" &&
        typeof l.goiId === "number" &&
        Number.isFinite(l.lopId) &&
        Number.isFinite(l.goiId)
    )
    .map((l) => ({ lopId: l.lopId, goiId: l.goiId }));

  const hasNguyenVongKey = Object.prototype.hasOwnProperty.call(st, "nguyen_vong");
  const nvParsed = hasNguyenVongKey ? parseNguyenVong(st.nguyen_vong) ?? [] : undefined;
  const hasAvatarKey = Object.prototype.hasOwnProperty.call(st, "avatar");

  const result = await createDongHocPhiOrder(
    supabase,
    {
      full_name: String(st.full_name ?? ""),
      sdt: String(st.sdt ?? ""),
      email: String(st.email ?? ""),
      sex: st.sex ?? null,
      nam_thi:
        st.nam_thi != null && Number.isFinite(Number(st.nam_thi))
          ? Number(st.nam_thi)
          : null,
      loai_khoa_hoc: st.loai_khoa_hoc ?? null,
      facebook: st.facebook ?? null,
      ...(hasAvatarKey ? { avatar: st.avatar ?? null } : {}),
      ...(hasNguyenVongKey ? { nguyen_vong: nvParsed } : {}),
    },
    lines
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? "ORDER" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    donId: result.donId,
    maDon: result.maDon,
    maDonSo: result.maDonSo,
    invoiceTotalDong: result.invoiceTotalDong,
    hocVienId: result.hocVienId,
  });
}
