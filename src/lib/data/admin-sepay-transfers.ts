import type { SupabaseClient } from "@supabase/supabase-js";

import { hpParseMoney } from "@/lib/data/hp-goi-payable";

export type SepayIncomingTransfer = {
  id: number;
  transactionDate: string;
  transferAmount: number;
  content: string;
  maDonTrichXuat: string | null;
  gateway: string | null;
};

function isIncomingTransferType(raw: string | null | undefined): boolean {
  const t = (raw ?? "").trim().toLowerCase();
  return t === "in" || t === "credit" || t.includes("thu");
}

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Các giao dịch chuyển khoản đến (SePay webhook `transferType: in`) — mới nhất trước. */
export async function fetchRecentSepayIncomingTransfers(
  supabase: SupabaseClient,
  opts?: { limit?: number; lookbackHours?: number },
): Promise<{ ok: true; items: SepayIncomingTransfer[] } | { ok: false; error: string }> {
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 30);
  const lookbackHours = Math.min(Math.max(opts?.lookbackHours ?? 72, 1), 168);
  const since = new Date(Date.now() - lookbackHours * 3_600_000).toISOString();

  const { data, error } = await supabase
    .from("hp_giao_dich_thanh_toan")
    .select("id, gateway, transaction_date, transfer_amount, transfer_type, content, ma_don_trich_xuat")
    .gte("transaction_date", since)
    .order("transaction_date", { ascending: false })
    .limit(limit * 3);

  if (error) {
    return { ok: false, error: error.message || "Không đọc được giao dịch SePay." };
  }

  const items: SepayIncomingTransfer[] = [];
  for (const raw of data ?? []) {
    const row = raw as {
      id?: unknown;
      gateway?: unknown;
      transaction_date?: unknown;
      transfer_amount?: unknown;
      transfer_type?: unknown;
      content?: unknown;
      ma_don_trich_xuat?: unknown;
    };
    if (!isIncomingTransferType(row.transfer_type != null ? String(row.transfer_type) : null)) continue;
    const id = nId(row.id);
    if (!id) continue;
    const amount = hpParseMoney(row.transfer_amount);
    if (amount <= 0) continue;
    const ts =
      row.transaction_date != null && String(row.transaction_date).trim() !== ""
        ? String(row.transaction_date)
        : "";
    items.push({
      id,
      transactionDate: ts,
      transferAmount: Math.round(amount),
      content: String(row.content ?? "").trim(),
      maDonTrichXuat: String(row.ma_don_trich_xuat ?? "").trim() || null,
      gateway: String(row.gateway ?? "").trim() || null,
    });
    if (items.length >= limit) break;
  }

  return { ok: true, items };
}

export type SepayIncomingTransferPage = {
  items: SepayIncomingTransfer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapIncomingRow(raw: {
  id?: unknown;
  gateway?: unknown;
  transaction_date?: unknown;
  transfer_amount?: unknown;
  transfer_type?: unknown;
  content?: unknown;
  ma_don_trich_xuat?: unknown;
}): SepayIncomingTransfer | null {
  if (!isIncomingTransferType(raw.transfer_type != null ? String(raw.transfer_type) : null)) return null;
  const id = nId(raw.id);
  if (!id) return null;
  const amount = hpParseMoney(raw.transfer_amount);
  if (amount <= 0) return null;
  const ts =
    raw.transaction_date != null && String(raw.transaction_date).trim() !== ""
      ? String(raw.transaction_date)
      : "";
  return {
    id,
    transactionDate: ts,
    transferAmount: Math.round(amount),
    content: String(raw.content ?? "").trim(),
    maDonTrichXuat: String(raw.ma_don_trich_xuat ?? "").trim() || null,
    gateway: String(raw.gateway ?? "").trim() || null,
  };
}

/** Lịch sử chuyển khoản đến — phân trang (mới nhất trước). */
export async function fetchSepayIncomingTransfersPaginated(
  supabase: SupabaseClient,
  opts: { page: number; pageSize: number },
): Promise<{ ok: true; data: SepayIncomingTransferPage } | { ok: false; error: string }> {
  const pageSize = Math.min(Math.max(opts.pageSize, 5), 50);
  const page = Math.max(opts.page, 1);

  const { data: allRows, error } = await supabase
    .from("hp_giao_dich_thanh_toan")
    .select("id, gateway, transaction_date, transfer_amount, transfer_type, content, ma_don_trich_xuat")
    .order("transaction_date", { ascending: false })
    .limit(5000);

  if (error) {
    return { ok: false, error: error.message || "Không đọc được giao dịch SePay." };
  }

  const allIncoming = (allRows ?? [])
    .map((raw) =>
      mapIncomingRow(
        raw as {
          id?: unknown;
          gateway?: unknown;
          transaction_date?: unknown;
          transfer_amount?: unknown;
          transfer_type?: unknown;
          content?: unknown;
          ma_don_trich_xuat?: unknown;
        },
      ),
    )
    .filter((x): x is SepayIncomingTransfer => x != null);

  const total = allIncoming.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = allIncoming.slice(start, start + pageSize);

  return {
    ok: true,
    data: { items, total, page: safePage, pageSize, totalPages },
  };
}
