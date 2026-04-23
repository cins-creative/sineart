import "server-only";

import {
  buildLyThuyetHref,
  fetchAllLyThuyet,
} from "@/lib/data/ly-thuyet";
import type { LyThuyet } from "@/types/ly-thuyet";
import { GROUP_ACCENT, NHOM_ORDER } from "@/types/ly-thuyet";

import LibNavLink from "./LibNavLink";

type Props = {
  /** ID của bài đang mở — dùng để highlight active trong nav. */
  currentId: number;
};

/**
 * Left sidebar của trang detail — render danh sách toàn bộ bài lý thuyết,
 * group theo `nhom`, highlight bài hiện tại.
 *
 * Tách thành Suspense boundary riêng vì:
 * 1. `fetchAllLyThuyet()` là query list chậm nhất trong 3 fetch của page.
 * 2. Sidebar không phải critical content (hero + body là critical LCP).
 * 3. User vẫn thấy nội dung bài ngay lập tức, sidebar stream vào sau.
 *
 * Fetch được `cache()` ở data layer → share promise với `RelatedNav`
 * trong cùng request (chỉ 1 round-trip DB).
 */
export default async function LibSidebarNav({ currentId }: Props) {
  const allItems = await fetchAllLyThuyet();

  const sidebarGroups: Array<{ nhom: string; items: LyThuyet[] }> = NHOM_ORDER.map(
    (nhom) => ({
      nhom: nhom as string,
      items: allItems.filter((r) => r.nhom === nhom),
    })
  ).filter((g) => g.items.length > 0);

  const knownNhom = new Set<string>(NHOM_ORDER);
  const otherNhoms = Array.from(
    new Set(
      allItems
        .map((r) => r.nhom)
        .filter((n): n is string => !!n && !knownNhom.has(n))
    )
  );
  for (const nhom of otherNhoms) {
    sidebarGroups.push({
      nhom,
      items: allItems.filter((r) => r.nhom === nhom),
    });
  }

  return (
    <>
      {sidebarGroups.map((g) => {
        const groupAccent = GROUP_ACCENT[g.nhom] ?? "#ee5b9f";
        return (
          <div
            className="lnav-section"
            key={g.nhom}
            style={{ ["--lnav-cat-accent" as string]: groupAccent }}
          >
            <p className="lnav-cat">{g.nhom}</p>
            {g.items.map((it) => (
              <LibNavLink
                key={it.id}
                href={buildLyThuyetHref(it.slug)}
                className="lnav-item"
                isActive={it.id === currentId}
              >
                {it.ten}
              </LibNavLink>
            ))}
          </div>
        );
      })}
    </>
  );
}
