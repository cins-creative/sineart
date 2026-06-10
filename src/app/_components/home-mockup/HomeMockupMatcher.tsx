"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MonThiThumb } from "@/app/_components/home-mockup/MonThiThumb";
import { MatchSearchSelect } from "@/app/_components/home-mockup/MatchSearchSelect";
import type { CinsMatcherPayload } from "@/lib/data/cins-matcher";

type Props = CinsMatcherPayload;

export function HomeMockupMatcher({
  schools,
  programsByOrg,
  resultsByMajorKey,
  defaultMajorKey,
}: Props) {
  const defaultSchoolId = useMemo(() => {
    if (defaultMajorKey) {
      for (const [orgId, programs] of Object.entries(programsByOrg)) {
        if (programs.some((p) => p.id === defaultMajorKey)) return orgId;
      }
    }
    return schools[0]?.id ?? "";
  }, [defaultMajorKey, programsByOrg, schools]);

  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [majorKey, setMajorKey] = useState(defaultMajorKey);

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools],
  );

  const programsForSchool = useMemo(
    () => programsByOrg[schoolId] ?? [],
    [programsByOrg, schoolId],
  );

  const majorOptions = useMemo(
    () =>
      programsForSchool.map((p) => ({
        value: p.id,
        label: p.label,
      })),
    [programsForSchool],
  );

  useEffect(() => {
    if (majorOptions.some((o) => o.value === majorKey)) return;
    const first = majorOptions[0];
    if (first) setMajorKey(first.value);
  }, [majorKey, majorOptions]);

  const activeResult = resultsByMajorKey[majorKey] ?? null;

  return (
    <section className="section">
      <div className="wrap">
        <div className="matcher">
          <div className="matcher-form-col">
            <span className="eyebrow">Lộ trình theo mục tiêu</span>
            <h2>Bạn thi trường nào?</h2>
            <p>
              Chọn trường và ngành — Sine Art gợi ý đúng môn thi và combo khóa nên học. Lộ trình chi tiết
              cho từng trường.
            </p>
            <div className="match-form">
              <MatchSearchSelect
                id="hm-school"
                label="Trường mục tiêu"
                options={schoolOptions}
                value={schoolId}
                searchable
                searchPlaceholder="Gõ tên trường để tìm…"
                onChange={(next) => {
                  if (!next) return;
                  setSchoolId(next);
                  const firstProgram = programsByOrg[next]?.[0];
                  if (firstProgram) setMajorKey(firstProgram.id);
                }}
              />
              <MatchSearchSelect
                id="hm-major"
                label="Ngành đăng ký"
                options={majorOptions}
                value={majorKey}
                onChange={setMajorKey}
                emptyLabel="Trường này chưa có ngành trong hệ thống"
              />
            </div>
          </div>
          {activeResult ? (
            <div className="match-result">
              <span className="eyebrow">Gợi ý lộ trình</span>
              <h4>{activeResult.resultTitle}</h4>
              {activeResult.hasConfig ? (
                <>
                  {activeResult.thumbs.length > 0 ? (
                    <div className="match-result-illus" aria-label="Môn thi năng khiếu">
                      {activeResult.thumbs.map((thumb) => (
                        <MonThiThumb key={thumb.ma || thumb.ten} thumb={thumb} />
                      ))}
                    </div>
                  ) : null}
                  {activeResult.rows.map((r) => (
                    <div key={r.label} className="rrow">
                      <span>{r.label}</span>
                      <b>{r.value}</b>
                    </div>
                  ))}
                  <Link
                    href={activeResult.ctaHref}
                    className="btn btn-primary"
                    style={{ marginTop: 18, width: "100%", justifyContent: "center" }}
                  >
                    Xem thông tin chi tiết <ArrowRight className="feather" aria-hidden />
                  </Link>
                </>
              ) : (
                <p className="match-empty">
                  Thông tin môn thi cho ngành này đang được cập nhật. Vui lòng chọn ngành khác hoặc liên
                  hệ Sine Art để được tư vấn.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
