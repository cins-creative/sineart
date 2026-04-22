import {
  fetchDhNguyenVongCatalog,
  type DhpDhCatalog,
  type DhpInitialNguyenVongRow,
} from "@/lib/donghocphi/dh-catalog";
import {
  dbRowToStep1Fields,
  isValidStudentEmail,
  type QlHocVienStep1Fields,
} from "@/lib/donghocphi/profile-step1";
import {
  fetchKyByKhoaHocVienIds,
  firstQlhvPerLopFromQlRows,
  qlEnrollmentKyByLopFromHpMap,
} from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { fetchEnrichedPaymentClasses } from "@/lib/data/payment-classes";
import { fetchPaymentFeeCatalog } from "@/lib/data/payment-fee-catalog";
import { createClient } from "@/lib/supabase/server";
import type { HocPhiComboRow, HocPhiGoiRow } from "@/types/khoa-hoc";
import DongHocPhiClient, {
  type PaymentClassItem,
  type PaymentFeeItem,
  type PaymentMonItem,
} from "../payment-client";

type Props = {
  preselectedMonId: number | null;
  courseName: string | null;
  initialEmail: string | null;
};

/**
 * Fetch toàn bộ dữ liệu cần cho luồng thanh toán + render client state machine.
 * Boundary này stream độc lập với NavBar — nav có thể hiện sớm hơn khi catalog lớn tải lâu.
 * Không đổi logic Supabase so với bản cũ (đã di chuyển từ `page.tsx`).
 */
export async function DongHocPhiPaymentSection({
  preselectedMonId,
  courseName,
  initialEmail,
}: Props) {
  const supabase = await createClient();

  let monHoc: PaymentMonItem[] = [];
  let lopHoc: PaymentClassItem[] = [];
  let goiHocPhi: PaymentFeeItem[] = [];
  let hocPhiCombos: HocPhiComboRow[] = [];
  let hocPhiGois: HocPhiGoiRow[] = [];
  let dhCatalog: DhpDhCatalog | null = null;

  if (supabase) {
    const [monRes, lopEnriched, dhCatRes] = await Promise.all([
      supabase
        .from("ql_mon_hoc")
        .select("id, ten_mon_hoc")
        .order("thu_tu_hien_thi", { ascending: true })
        .order("id", { ascending: true }),
      fetchEnrichedPaymentClasses(supabase),
      fetchDhNguyenVongCatalog(supabase),
    ]);

    monHoc = (monRes.data ?? []).map((row) => ({
      id: Number(row.id),
      tenMonHoc: String(row.ten_mon_hoc ?? "").trim() || `Môn ${row.id}`,
    }));

    lopHoc = lopEnriched;
    if (!dhCatRes.error && dhCatRes.catalog) {
      dhCatalog = dhCatRes.catalog;
    }

    const monIdsForFees = monHoc.map((m) => m.id);
    const bundle = await fetchPaymentFeeCatalog(monIdsForFees);
    goiHocPhi = bundle.fees;
    hocPhiCombos = bundle.combos;
    hocPhiGois = bundle.gois;
  }

  let existingHocVien: QlHocVienStep1Fields | null = null;
  let initialEnrolledClassIds: number[] = [];
  const initialQlhvIdByLopId: Record<number, number> = {};
  let initialQlKyByLopId: Record<
    number,
    { ngayDauKy: string | null; ngayCuoiKy: string | null }
  > = {};
  let initialNguyenVong: DhpInitialNguyenVongRow[] | null = null;
  let initialHocVienId: number | null = null;
  let initialAvatarUrl: string | null = null;

  // Ưu tiên email từ URL; nếu không có thì dùng email của user đang đăng nhập
  let effectiveEmail = initialEmail;
  if (!effectiveEmail && supabase) {
    const { data: authData } = await supabase.auth.getUser();
    const authEmail = authData?.user?.email?.trim().toLowerCase() ?? null;
    if (authEmail && isValidStudentEmail(authEmail)) {
      effectiveEmail = authEmail;
    }
  }

  if (supabase && effectiveEmail && isValidStudentEmail(effectiveEmail)) {
    const em = effectiveEmail.trim().toLowerCase();
    const { data: hvRow, error: hvErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name, sdt, email, sex, nam_thi, loai_khoa_hoc, facebook, avatar")
      .ilike("email", em)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!hvErr && hvRow) {
      const hvId = Number((hvRow as { id: unknown }).id);
      if (Number.isFinite(hvId) && hvId > 0) {
        initialHocVienId = hvId;
        const loaiKhoa = String(
          (hvRow as { loai_khoa_hoc?: unknown }).loai_khoa_hoc ?? "",
        ).trim();
        if (loaiKhoa === "Luyện thi") {
          const { data: nvRows, error: nvErr } = await supabase
            .from("ql_hv_truong_nganh")
            .select("truong_dai_hoc, nganh_dao_tao")
            .eq("hoc_vien", hvId)
            .order("id", { ascending: true });
          if (!nvErr && nvRows?.length) {
            const rows: DhpInitialNguyenVongRow[] = [];
            for (const r of nvRows) {
              const row = r as {
                truong_dai_hoc?: unknown;
                nganh_dao_tao?: unknown;
              };
              const t = Number(row.truong_dai_hoc);
              const n = Number(row.nganh_dao_tao);
              if (
                !Number.isFinite(t) ||
                t <= 0 ||
                !Number.isFinite(n) ||
                n <= 0
              )
                continue;
              rows.push({ truongId: t, nganhId: n });
            }
            if (rows.length) initialNguyenVong = rows;
          }
        }

        const { data: qlRows, error: qlErr } = await supabase
          .from("ql_quan_ly_hoc_vien")
          .select("id, lop_hoc")
          .eq("hoc_vien_id", hvId)
          .order("id", { ascending: false });
        if (!qlErr && qlRows?.length) {
          const knownLop = new Set(lopHoc.map((c) => c.id));
          const { lopIdsOrdered, qlhvIdByLop } = firstQlhvPerLopFromQlRows(
            qlRows,
            knownLop,
          );
          const kyMap = await fetchKyByKhoaHocVienIds(
            supabase,
            Object.values(qlhvIdByLop),
          );
          initialQlKyByLopId = qlEnrollmentKyByLopFromHpMap(qlhvIdByLop, kyMap);
          initialEnrolledClassIds = lopIdsOrdered;
          for (const lid of initialEnrolledClassIds) {
            const q = qlhvIdByLop[lid];
            if (q != null && Number.isFinite(q) && q > 0) {
              initialQlhvIdByLopId[lid] = q;
            }
          }
        }
      }
      const mapped = dbRowToStep1Fields(hvRow);
      if (mapped) {
        initialAvatarUrl = mapped.avatar;
        // Luôn truyền xuống client để pre-fill fields; skip step 1 nếu đủ điều kiện
        existingHocVien = mapped;
      }
    }
  }

  return (
    <DongHocPhiClient
      monHoc={monHoc}
      lopHoc={lopHoc}
      goiHocPhi={goiHocPhi}
      hocPhiCombos={hocPhiCombos}
      hocPhiGois={hocPhiGois}
      preselectedMonId={preselectedMonId}
      initialCourseName={courseName}
      initialEmail={effectiveEmail}
      existingHocVien={existingHocVien}
      initialEnrolledClassIds={initialEnrolledClassIds}
      initialQlKyByLopId={initialQlKyByLopId}
      initialQlhvIdByLopId={initialQlhvIdByLopId}
      dhCatalog={dhCatalog}
      initialNguyenVong={initialNguyenVong}
      initialHocVienId={initialHocVienId}
      initialAvatarUrl={initialAvatarUrl}
    />
  );
}
