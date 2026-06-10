"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MatchSearchSelect } from "@/app/_components/home-mockup/MatchSearchSelect";
import type { HomeMockupMatcherOption, HomeMockupMatcherSchool } from "@/lib/data/home-mockup";

type Props = {
  schools: HomeMockupMatcherSchool[];
  options: HomeMockupMatcherOption[];
  defaultOptionKey: string;
};

function schoolValue(id: number): string {
  return String(id);
}

export function HomeMockupMatcher({ schools, options, defaultOptionKey }: Props) {
  const defaultOption =
    options.find((o) => o.majorKey === defaultOptionKey) ?? options[0] ?? null;

  const [schoolId, setSchoolId] = useState(
    defaultOption?.schoolId ?? schools[0]?.id ?? 0,
  );
  const [majorKey, setMajorKey] = useState(defaultOption?.majorKey ?? "");

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: schoolValue(s.id), label: s.name })),
    [schools],
  );

  const majorsForSchool = useMemo(
    () => options.filter((o) => o.schoolId === schoolId),
    [options, schoolId],
  );

  const majorOptions = useMemo(
    () =>
      (majorsForSchool.length ? majorsForSchool : options).map((o) => ({
        value: o.majorKey,
        label: o.majorLabel,
      })),
    [majorsForSchool, options],
  );

  useEffect(() => {
    if (majorOptions.some((o) => o.value === majorKey)) return;
    const first = majorOptions[0];
    if (first) setMajorKey(first.value);
  }, [majorKey, majorOptions]);

  const activeMajor =
    options.find((o) => o.majorKey === majorKey) ?? majorsForSchool[0] ?? options[0];

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
                value={schoolValue(schoolId)}
                searchable
                searchPlaceholder="Gõ tên trường để tìm…"
                onChange={(next) => {
                  const id = Number(next);
                  if (!Number.isFinite(id)) return;
                  setSchoolId(id);
                  const firstMajor = options.find((o) => o.schoolId === id);
                  if (firstMajor) setMajorKey(firstMajor.majorKey);
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
          {activeMajor ? (
            <div className="match-result">
              <span className="eyebrow">Gợi ý lộ trình</span>
              <h4>{activeMajor.resultTitle}</h4>
              {activeMajor.rows.map((r) => (
                <div key={r.label} className="rrow">
                  <span>{r.label}</span>
                  <b>{r.value}</b>
                </div>
              ))}
              <Link
                href={activeMajor.ctaHref}
                className="btn btn-primary"
                style={{ marginTop: 18, width: "100%", justifyContent: "center" }}
              >
                Xem thông tin chi tiết <ArrowRight className="feather" aria-hidden />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
