import { upsertDiemDanhImage } from "@/lib/phong-hoc/diem-danh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

import { hvChatboxInsert, hvChatboxSelectByLop } from "./lop-column";
export const runtime = "nodejs";

type HvChatboxUserType = "Student" | "Teacher";

export async function GET(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const lop = Number(url.searchParams.get("lopHocId"));
  if (!Number.isFinite(lop) || lop <= 0) {
    return NextResponse.json({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }

  const after = url.searchParams.get("after")?.trim() || null;

  try {
    const { rows } = await hvChatboxSelectByLop(sb, lop, { after });
    return NextResponse.json({ messages: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi truy vấn chat.";
    return NextResponse.json({ error: msg, code: "QUERY" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }

  const ut = body.usertype;
  if (ut !== "Teacher" && ut !== "Student") {
    return NextResponse.json({ error: "usertype phải là Teacher hoặc Student.", code: "BAD_TYPE" }, { status: 400 });
  }

  const nameRaw = body.name;
  const name: number | null =
    nameRaw == null || nameRaw === ""
      ? null
      : Number.isFinite(Number(nameRaw))
        ? Number(nameRaw)
        : NaN;
  if (name != null && !Number.isFinite(name)) {
    return NextResponse.json({ error: "name (qlhv_id) không hợp lệ.", code: "BAD_NAME" }, { status: 400 });
  }

  const content =
    typeof body.content === "string"
      ? body.content.trim() || null
      : body.content == null
        ? null
        : String(body.content).trim() || null;
  const photo =
    typeof body.photo === "string"
      ? body.photo.trim() || null
      : body.photo == null
        ? null
        : String(body.photo).trim() || null;

  if (!content && !photo) {
    return NextResponse.json(
      { error: "Cần nội dung chữ hoặc ảnh.", code: "EMPTY_BODY" },
      { status: 400 }
    );
  }

  const base: Record<string, unknown> = {
    usertype: ut as HvChatboxUserType,
    name,
    content,
    photo,
  };

  try {
    const { message } = await hvChatboxInsert(sb, lopHocId, base);

    if (ut === "Student" && photo && name != null && Number.isFinite(name)) {
      const { data: en } = await sb
        .from("ql_quan_ly_hoc_vien")
        .select("hoc_vien_id")
        .eq("id", name)
        .maybeSingle();
      const hvPk = Number((en as { hoc_vien_id?: unknown } | null)?.hoc_vien_id);
      if (Number.isFinite(hvPk) && hvPk > 0) {
        await upsertDiemDanhImage(sb, lopHocId, hvPk);
      }
    }

    return NextResponse.json({ message });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gửi tin thất bại.";
    return NextResponse.json({ error: msg, code: "INSERT" }, { status: 500 });
  }
}
