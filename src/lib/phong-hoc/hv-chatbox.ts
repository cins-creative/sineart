import type { SupabaseClient } from "@supabase/supabase-js";

export type HvChatboxUserType = "Student" | "Teacher";

/** Một dòng `hv_chatbox` — `name` là `ql_quan_ly_hoc_vien.id` khi học viên gửi; GV thường để null. */
export type HvChatboxRow = {
  id: number;
  created_at: string;
  content: string | null;
  photo: string | null;
  usertype: HvChatboxUserType;
  name: number | null;
};

export type ChatStudentMapEntry = {
  qlhvId: number;
  hocVienId: number;
  name: string;
  exId: number | null;
};

export type ChatExerciseEntry = {
  id: number;
  ten_bai_tap: string;
  bai_so: number | null;
  thumbnail: string | null;
  mon: string;
  order: number;
};

const SUBJ_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

const monColorCache: Record<string, string> = {};
let monColorIdx = 0;

export function chatSubjectColor(mon: string): string {
  const k = mon.trim() || "—";
  if (monColorCache[k]) return monColorCache[k];
  const c = SUBJ_COLORS[monColorIdx % SUBJ_COLORS.length];
  monColorIdx += 1;
  monColorCache[k] = c;
  return c;
}

export function parseQlhvKey(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function baiSoOrder(baiSo: number | null): number {
  if (baiSo == null || !Number.isFinite(baiSo)) return 0;
  return baiSo;
}

/** FK lớp — đồng bộ `hv_bai_hoc_vien.lop_hoc`, không dùng cột `class`. */
const HV_CHAT_LOP_FK = "lop_hoc" as const;

export async function fetchHvChatboxMessages(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<HvChatboxRow[]> {
  const { data, error } = await supabase
    .from("hv_chatbox")
    .select("id,created_at,content,photo,usertype,name")
    .eq(HV_CHAT_LOP_FK, lopHocId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as HvChatboxRow[];
}

export async function insertHvChatboxMessage(
  supabase: SupabaseClient,
  payload: {
    lop_hoc: number;
    usertype: HvChatboxUserType;
    name: number | null;
    content: string | null;
    photo: string | null;
  }
): Promise<HvChatboxRow[]> {
  const { data, error } = await supabase
    .from("hv_chatbox")
    .insert(payload)
    .select("id,created_at,content,photo,usertype,name")
    .limit(1);
  if (error) throw error;
  return (data ?? []) as HvChatboxRow[];
}

async function chatApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const raw = await res.text();
  let j: unknown;
  try {
    j = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw.trim().slice(0, 240) || `Phản hồi không phải JSON (HTTP ${res.status}).`);
  }
  const obj = j as T & { error?: string; code?: string };
  if (!res.ok) {
    const msg =
      typeof obj === "object" && obj && "error" in obj && typeof obj.error === "string"
        ? obj.error
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return obj as T;
}

/** Đọc tin (server — service role, bỏ qua RLS). */
export async function apiFetchHvChatboxMessages(lopHocId: number): Promise<HvChatboxRow[]> {
  const u = `/api/phong-hoc/hv-chatbox?lopHocId=${encodeURIComponent(String(lopHocId))}`;
  const j = await chatApiJson<{ messages: HvChatboxRow[] }>(u);
  return j.messages ?? [];
}

/** Poll tin mới sau mốc thời gian. */
export async function apiPollHvChatboxAfter(
  lopHocId: number,
  afterIso: string
): Promise<HvChatboxRow[]> {
  const u = `/api/phong-hoc/hv-chatbox?lopHocId=${encodeURIComponent(String(lopHocId))}&after=${encodeURIComponent(afterIso)}`;
  const j = await chatApiJson<{ messages: HvChatboxRow[] }>(u);
  return j.messages ?? [];
}

/** Gửi tin (server — service role). */
export async function apiInsertHvChatboxMessage(params: {
  lopHocId: number;
  usertype: HvChatboxUserType;
  name: number | null;
  content: string | null;
  photo: string | null;
}): Promise<HvChatboxRow> {
  const j = await chatApiJson<{ message: HvChatboxRow }>("/api/phong-hoc/hv-chatbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lopHocId: params.lopHocId,
      usertype: params.usertype,
      name: params.name,
      content: params.content,
      photo: params.photo,
    }),
  });
  if (!j.message) throw new Error("Không nhận được tin sau khi gửi.");
  return j.message;
}

/** Học viên trong lớp theo `ql_quan_ly_hoc_vien.id` (trùng cột `hv_chatbox.name`). */
export async function fetchChatStudentMapByQlhv(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<Record<number, ChatStudentMapEntry>> {
  const { data: enrollments, error } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, tien_do_hoc")
    .eq("lop_hoc", lopHocId);

  if (error || !enrollments?.length) return {};

  const rows = enrollments as {
    id: unknown;
    hoc_vien_id: unknown;
    tien_do_hoc: unknown;
  }[];

  const byHv = new Map<number, (typeof rows)[0]>();
  for (const r of rows) {
    const hv = Number(r.hoc_vien_id);
    if (!Number.isFinite(hv)) continue;
    const prev = byHv.get(hv);
    if (!prev || Number(r.id) > Number(prev.id)) byHv.set(hv, r);
  }

  const hvIds = [...byHv.values()]
    .map((r) => Number(r.hoc_vien_id))
    .filter(Number.isFinite);
  if (!hvIds.length) return {};

  const { data: profiles } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id, full_name")
    .in("id", hvIds);

  const nameByHv = new Map<number, string>();
  for (const p of profiles ?? []) {
    const id = Number((p as { id: unknown }).id);
    if (!Number.isFinite(id)) continue;
    const fn = String((p as { full_name?: unknown }).full_name ?? "").trim();
    nameByHv.set(id, fn || "Học viên");
  }

  const out: Record<number, ChatStudentMapEntry> = {};
  for (const r of byHv.values()) {
    const qlhvId = Number(r.id);
    const hvId = Number(r.hoc_vien_id);
    if (!Number.isFinite(qlhvId) || !Number.isFinite(hvId)) continue;
    const name = nameByHv.get(hvId) ?? "Học viên";
    const exRaw = r.tien_do_hoc;
    const exId =
      exRaw != null && exRaw !== "" && Number.isFinite(Number(exRaw)) ? Number(exRaw) : null;
    out[qlhvId] = { qlhvId, hocVienId: hvId, name, exId };
  }
  return out;
}

/** Meta bài tập cho vòng tiến độ MiniRing + màu môn. */
export async function fetchChatExerciseIndex(
  supabase: SupabaseClient
): Promise<{
  exMap: Record<number, ChatExerciseEntry>;
  totalBySubject: Record<string, number>;
}> {
  const { data: tasks, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, ten_bai_tap, bai_so, thumbnail, mon_hoc")
    .limit(5000);

  if (error) throw error;

  const monIds = new Set<number>();
  for (const t of tasks ?? []) {
    const mh = (t as { mon_hoc?: unknown }).mon_hoc;
    if (mh != null && Number.isFinite(Number(mh))) monIds.add(Number(mh));
  }

  const monNameById = new Map<number, string>();
  if (monIds.size) {
    const { data: mons } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", [...monIds]);
    for (const m of mons ?? []) {
      const id = Number((m as { id: unknown }).id);
      if (!Number.isFinite(id)) continue;
      monNameById.set(id, String((m as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim());
    }
  }

  const bySubj: Record<string, number[]> = {};
  const exMap: Record<number, ChatExerciseEntry> = {};

  for (const raw of tasks ?? []) {
    const row = raw as {
      id: unknown;
      ten_bai_tap?: unknown;
      bai_so?: unknown;
      thumbnail?: unknown;
      mon_hoc?: unknown;
    };
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    const monId = row.mon_hoc != null ? Number(row.mon_hoc) : NaN;
    const mon = Number.isFinite(monId) ? monNameById.get(monId) || "Chưa phân loại" : "Chưa phân loại";
    const bs = row.bai_so != null ? Number(row.bai_so) : null;
    const order = baiSoOrder(bs);
    exMap[id] = {
      id,
      ten_bai_tap: String(row.ten_bai_tap ?? "").trim() || "Bài tập",
      bai_so: bs,
      thumbnail: row.thumbnail != null ? String(row.thumbnail) : null,
      mon,
      order,
    };
    if (!bySubj[mon]) bySubj[mon] = [];
    bySubj[mon].push(order);
  }

  const totalBySubject: Record<string, number> = {};
  for (const [mon, orders] of Object.entries(bySubj)) {
    const valid = orders.filter((n) => n > 0);
    totalBySubject[mon] = valid.length ? Math.max(...valid) : orders.length;
  }

  return { exMap, totalBySubject };
}

export function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function chatCacheKey(classId: number): string {
  return `sine_chat_msgs_${classId}`;
}
