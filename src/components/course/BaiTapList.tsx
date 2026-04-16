"use client";

import type { BaiTap, MucDoQuanTrong } from "@/types/baiTap";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { toEmbedUrl } from "@/lib/utils/youtube";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./BaiTapList.module.css";

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function badgeClass(m: MucDoQuanTrong): string {
  switch (m) {
    case "Tập luyện":
      return styles.badgeTl;
    case "Tuỳ chọn":
      return styles.badgeTc;
    default:
      return styles.badgeBb;
  }
}

function parseLietKe(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .flatMap((line) => line.split("•"))
    .map((s) => s.trim())
    .filter(Boolean);
}

function LockIcon() {
  return (
    <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Chevron({
  open,
  reducedMotion,
}: {
  open: boolean;
  reducedMotion: boolean | null;
}) {
  const rm = reducedMotion === true;
  return (
    <motion.svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      animate={{ rotate: open ? 180 : 0 }}
      transition={rm ? { duration: 0 } : { duration: 0.28, ease: EASE }}
    >
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" />
    </motion.svg>
  );
}

export type BaiTapListProps = {
  monHocId?: number;
  initialData: BaiTap[];
  enrollUrl?: string;
};

export default function BaiTapList({
  monHocId,
  initialData,
  enrollUrl = "/donghocphi",
}: BaiTapListProps) {
  const reducedMotion = useReducedMotion();
  const rm = reducedMotion === true;

  const [activeMon, setActiveMon] = useState<string>("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const monOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of initialData) {
      const n = b.mon_hoc.ten_mon_hoc.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [initialData]);

  const grouped = useMemo(() => {
    let rows = initialData;
    if (monHocId == null && activeMon !== "all") {
      rows = rows.filter((b) => b.mon_hoc.ten_mon_hoc === activeMon);
    }
    const map = new Map<string, BaiTap[]>();
    for (const b of rows) {
      const name = b.mon_hoc.ten_mon_hoc.trim() || "Môn học";
      const list = map.get(name) ?? [];
      list.push(b);
      map.set(name, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.bai_so - b.bai_so);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "vi")
    );
  }, [initialData, monHocId, activeMon]);

  const showSubjectSelect = monHocId == null && monOptions.length > 1;

  const listKey = activeMon;

  const bodyTransition = rm
    ? { duration: 0.15 }
    : { duration: 0.32, ease: EASE };

  if (initialData.length === 0) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>Chưa có dữ liệu bài tập cho khóa này.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {showSubjectSelect ? (
        <div className={styles.controls}>
          <select
            className={styles.subjectSelect}
            value={activeMon}
            onChange={(e) => setActiveMon(e.target.value)}
            aria-label="Chọn môn học"
          >
            <option value="all">Tất cả môn</option>
            {monOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {grouped.length === 0 ? (
          <motion.p
            key="empty-filter"
            className={styles.empty}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            Không có bài tập phù hợp.
          </motion.p>
        ) : (
          <div key={listKey}>
            {grouped.map(([monName, items]) => (
              <div key={monName} className={styles.subjectBlock}>
                <div className={styles.subjectHeader}>
                  {monName} ({items.length} bài)
                </div>
                {items.map((d) => {
                  const open = openId === d.id;
                  const embed =
                    d.is_visible && d.video_bai_giang
                      ? toEmbedUrl(d.video_bai_giang)
                      : null;
                  const bullets = parseLietKe(d.noi_dung_liet_ke);
                  const thumbSrc = d.thumbnail
                    ? cfImageForThumbnail(d.thumbnail) || d.thumbnail
                    : null;
                  return (
                    <div
                      key={d.id}
                      className={`${styles.lessonRow} ${open ? styles.lessonRowOpen : ""}`}
                    >
                      <motion.button
                        type="button"
                        className={styles.lessonHead}
                        onClick={() =>
                          setOpenId((prev) => (prev === d.id ? null : d.id))
                        }
                        aria-expanded={open}
                      >
                        <div className={styles.thumbWrap}>
                          {thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbSrc}
                              alt=""
                              className={styles.thumbImg}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.thumbPlaceholder} aria-hidden />
                          )}
                        </div>
                        <div className={styles.headMain}>
                          <span className={styles.baiSo}>Bài {d.bai_so}</span>
                          <span className={styles.tenBai}>{d.ten_bai_tap}</span>
                        </div>
                        <span
                          className={`${styles.badge} ${badgeClass(d.muc_do_quan_trong)}`}
                        >
                          {d.muc_do_quan_trong}
                        </span>
                        <span className={styles.buoiTag}>{d.so_buoi} buổi</span>
                        <Chevron open={open} reducedMotion={reducedMotion} />
                      </motion.button>
                      <motion.div
                        className={styles.lessonBodyMotion}
                        initial={false}
                        animate={{
                          height: open ? "auto" : 0,
                          opacity: open ? 1 : 0,
                        }}
                        transition={bodyTransition}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className={styles.lessonBodyInner}
                          aria-hidden={!open}
                        >
                          {bullets.length > 0 ? (
                            <>
                              <div className={styles.sectionLabel}>
                                Nội dung bài học
                              </div>
                              <ul className={styles.lietKeList}>
                                {bullets.map((line, bi) => (
                                  <li key={`${d.id}-${bi}`}>{line}</li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                          {!d.is_visible ? (
                            <div className={styles.lockBox}>
                              <LockIcon />
                              <p className={styles.lockTitle}>
                                Nội dung dành riêng cho học viên
                              </p>
                              <p className={styles.lockSub}>
                                Đăng ký khóa học để xem đầy đủ
                                <br />
                                và học trực tiếp với giáo viên
                              </p>
                              <Link href={enrollUrl} className={styles.lockCta}>
                                Đăng ký khóa học
                              </Link>
                            </div>
                          ) : embed ? (
                            <div className={styles.videoWrap}>
                              <iframe
                                src={embed}
                                title={d.ten_bai_tap}
                                loading="lazy"
                                allowFullScreen
                              />
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
