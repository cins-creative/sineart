import type { SupabaseClient } from "@supabase/supabase-js";

import { hpParseMoney } from "@/lib/data/hp-goi-payable";
import {
  extractSePayRawTransactionDate,
  sepayTransactionInstantMs,
} from "@/lib/sepay/sepay-datetime";

export type SepayIncomingTransfer = {
  id: number;
  /** ISO từ DB (`transaction_date`). */
  transactionDate: string;
  /** Giờ gốc SePay `YYYY-MM-DD HH:mm:ss` (GMT+7) — dùng để hiển thị đúng. */
  sepayTransactionDateLocal: string | null;
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
    .select("id, gateway, transaction_date, transfer_amount, transfer_type, content, ma_don_trich_xuat, raw_webhook")
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
      raw_webhook?: unknown;
    };
    const mapped = mapIncomingRow(row);
    if (!mapped) continue;
    items.push(mapped);
    if (items.length >= limit) break;
  }

  items.sort(compareSepayTransfersNewestFirst);

  return { ok: true, items };
}

function mapIncomingRow(raw: {
  id?: unknown;
  gateway?: unknown;
  transaction_date?: unknown;
  transfer_amount?: unknown;
  transfer_type?: unknown;
  content?: unknown;
  ma_don_trich_xuat?: unknown;
  raw_webhook?: unknown;
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
    sepayTransactionDateLocal: extractSePayRawTransactionDate(raw.raw_webhook),
    transferAmount: Math.round(amount),
    content: String(raw.content ?? "").trim(),
    maDonTrichXuat: String(raw.ma_don_trich_xuat ?? "").trim() || null,
    gateway: String(raw.gateway ?? "").trim() || null,
  };
}

function compareSepayTransfersNewestFirst(a: SepayIncomingTransfer, b: SepayIncomingTransfer): number {
  return (
    sepayTransactionInstantMs(b.transactionDate, b.sepayTransactionDateLocal) -
    sepayTransactionInstantMs(a.transactionDate, a.sepayTransactionDateLocal)
  );
}

export type SepayIncomingTransferPage = {
  items: SepayIncomingTransfer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
};

/** Khớp mã đơn SA…, `ma_don_trich_xuat`, hoặc nội dung chuyển khoản. */
export function sepayTransferMatchesSearch(tx: SepayIncomingTransfer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const maDon = (tx.maDonTrichXuat ?? "").toLowerCase();
  const content = tx.content.toLowerCase();
  if (maDon.includes(q) || content.includes(q)) return true;
  const compact = q.replace(/\s+/g, "");
  if (compact && (maDon.includes(compact) || content.replace(/\s+/g, "").includes(compact))) return true;
  const saInQuery = q.match(/sa[\d]{0,6}/i)?.[0]?.toUpperCase();
  if (saInQuery) {
    const label = tx.maDonTrichXuat?.toUpperCase() ?? tx.content.match(/SA\d{6}/i)?.[0]?.toUpperCase() ?? "";
    if (label.startsWith(saInQuery) || content.toUpperCase().includes(saInQuery)) return true;
  }
  return false;
}

/** Lịch sử chuyển khoản đến — phân trang (mới nhất trước). */
export async function fetchSepayIncomingTransfersPaginated(
  supabase: SupabaseClient,
  opts: { page: number; pageSize: number; search?: string },
): Promise<{ ok: true; data: SepayIncomingTransferPage } | { ok: false; error: string }> {
  const pageSize = Math.min(Math.max(opts.pageSize, 5), 50);
  const page = Math.max(opts.page, 1);
  const search = (opts.search ?? "").trim();

  const { data: allRows, error } = await supabase
    .from("hp_giao_dich_thanh_toan")
    .select("id, gateway, transaction_date, transfer_amount, transfer_type, content, ma_don_trich_xuat, raw_webhook")
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
          raw_webhook?: unknown;
        },
      ),
    )
    .filter((x): x is SepayIncomingTransfer => x != null)
    .filter((tx) => sepayTransferMatchesSearch(tx, search))
    .sort(compareSepayTransfersNewestFirst);

  const total = allIncoming.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = total === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = allIncoming.slice(start, start + pageSize);

  return {
    ok: true,
    data: { items, total, page: safePage, pageSize, totalPages, search },
  };
}
