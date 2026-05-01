"use client";

import { AlertTriangle, Calculator, ChevronRight, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";

import type { Truong } from "@/data/tinh-diem";
import { DANH_SACH_TRUONG } from "@/data/tinh-diem";
import { cn } from "@/lib/utils";

import "./tinh-diem.css";

type Step = 1 | 2 | 3;

function fmtScore(n: number): string {
  return n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function TinhDiemClient() {
  const [step, setStep] = useState<Step>(1);
  const [truong, setTruong] = useState<Truong | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tongDiem, setTongDiem] = useState<number | null>(null);

  const resetAll = useCallback(() => {
    setStep(1);
    setTruong(null);
    setInputs({});
    setFieldErrors({});
    setTongDiem(null);
  }, []);

  const selectSchool = useCallback((t: Truong) => {
    setTruong(t);
    const init: Record<string, string> = {};
    for (const inp of t.cong_thuc.inputs) init[inp.key] = "";
    setInputs(init);
    setFieldErrors({});
    setTongDiem(null);
    setStep(2);
  }, []);

  const validateAndCompute = useCallback((): number | null => {
    if (!truong) return null;
    const errs: Record<string, string> = {};
    const nums: Record<string, number> = {};

    for (const inp of truong.cong_thuc.inputs) {
      const raw = (inputs[inp.key] ?? "").trim();
      if (raw === "") {
        errs[inp.key] = "Vui lòng nhập điểm.";
        continue;
      }
      const v = Number(raw.replace(",", "."));
      if (!Number.isFinite(v)) {
        errs[inp.key] = "Giá trị không hợp lệ.";
        continue;
      }
      if (v < 0 || v > inp.diem_toi_da) {
        errs[inp.key] = `Trong khoảng 0 – ${inp.diem_toi_da}.`;
        continue;
      }
      nums[inp.key] = v;
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    return truong.cong_thuc.tinh(nums);
  }, [truong, inputs]);

  const handleSubmitScores = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const total = validateAndCompute();
      if (total === null) return;
      setTongDiem(total);
      setStep(3);
    },
    [validateAndCompute],
  );

  return (
    <div className="sa-tinh-diem pb-10">
      <div className="td-hero">
        <h1>Tính điểm xét tuyển năng khiếu</h1>
        <p>
          Chọn trường, nhập điểm theo đúng thang quy định — công cụ so sánh sơ bộ với điểm chuẩn tham khảo (cập nhật theo
          từng năm).
        </p>
      </div>

      <div className="td-steps">
        <span className={cn(step === 1 && "td-on")}>1 · Chọn trường</span>
        <span className={cn(step === 2 && "td-on")}>2 · Nhập điểm</span>
        <span className={cn(step === 3 && "td-on")}>3 · Kết quả</span>
      </div>

      {step === 1 ? (
        <div className="td-grid">
          {DANH_SACH_TRUONG.map((t) => (
            <button key={t.id} type="button" className="td-card text-left" onClick={() => selectSchool(t)}>
              <span className="td-card-badge">{t.viet_tat}</span>
              <h2>{t.ten}</h2>
              <p className="td-card-mons">
                <span className="font-semibold text-[rgba(45,32,32,0.72)]">Môn NK:</span> {t.cac_mon.join(" · ")}
              </p>
              <p className="td-card-mons mt-2 text-[11px]">{t.cong_thuc.mo_ta}</p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 && truong ? (
        <form className="td-form-wrap" onSubmit={handleSubmitScores} noValidate>
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[rgba(45,32,32,0.08)] bg-white p-4 shadow-sm">
            <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-[#ee5b9f]" aria-hidden />
            <div>
              <p className="font-[family-name:var(--font-be-vietnam-pro)] text-sm font-bold text-[#2d2020]">
                {truong.ten}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-[rgba(45,32,32,0.65)]">{truong.cong_thuc.mo_ta}</p>
            </div>
          </div>

          {truong.cong_thuc.inputs.map((inp) => (
            <div key={inp.key} className="td-field mb-4">
              <label htmlFor={inp.key}>
                {inp.label}
                <span className="text-[rgba(45,32,32,0.45)]"> (tối đa {inp.diem_toi_da})</span>
              </label>
              <input
                id={inp.key}
                name={inp.key}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={inputs[inp.key] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                aria-invalid={Boolean(fieldErrors[inp.key])}
              />
              {fieldErrors[inp.key] ? <p className="td-field-err">{fieldErrors[inp.key]}</p> : null}
            </div>
          ))}

          <div className="td-actions">
            <button type="button" className="td-btn-ghost inline-flex items-center gap-2" onClick={() => setStep(1)}>
              ← Chọn trường khác
            </button>
            <button type="submit" className="td-btn-primary inline-flex items-center justify-center gap-2">
              Xem kết quả
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 && truong && tongDiem != null ? (
        <>
          <div className="td-result-head">
            <p className="text-sm font-semibold text-[rgba(45,32,32,0.55)]">Điểm tổng (theo công thức trường)</p>
            <p className="td-result-score mt-2">{fmtScore(tongDiem)}</p>
            <p className="mt-2 text-xs text-[rgba(45,32,32,0.5)]">{truong.cong_thuc.mo_ta}</p>
          </div>

          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Ngành / chương</th>
                  <th>Điểm chuẩn (tham khảo)</th>
                  <th>Chênh lệch</th>
                  <th>Dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(truong.diem_chuan_gan_nhat)
                  .map(([nganh, chuan]) => {
                    const margin = tongDiem - chuan;
                    const pass = margin >= 0;
                    return { nganh, chuan, margin, pass };
                  })
                  .sort((a, b) => b.margin - a.margin)
                  .map(({ nganh, chuan, margin, pass }) => (
                    <tr key={nganh}>
                      <td className="font-semibold text-[#2d2020]">{nganh}</td>
                      <td>{fmtScore(chuan)}</td>
                      <td className={pass ? "td-pass" : "td-fail"}>
                        {margin >= 0 ? "+" : ""}
                        {fmtScore(margin)}
                      </td>
                      <td className={pass ? "td-pass" : "td-fail"}>{pass ? "Đạt ngưỡng" : "Dưới ngưỡng"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="td-disclaimer flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#f8a668]" aria-hidden />
            <div>
              <p className="font-bold text-[#2d2020]">Lưu ý</p>
              <p className="mt-1">
                Điểm chuẩn và công thức mang tính tham khảo theo đề án gần nhất; mỗi năm trường có thể điều chỉnh. Kết quả
                không thay thế thông báo chính thức của trường. Nên đối chiếu với đề tuyển sinh năm bạn dự thi.
              </p>
            </div>
          </div>

          <div className="flex justify-center px-4">
            <button type="button" className="td-btn-ghost inline-flex items-center gap-2" onClick={resetAll}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Tính lại
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
