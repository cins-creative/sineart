import { parseVideoBaiGiangEntries } from "@/lib/utils/youtube";

/**
 * Danh sách "Lỗi sai thường gặp" — YouTube Shorts dạng 9:16.
 * Input: `loi_sai` (textarea) từ `hv_he_thong_bai_tap`. Mỗi dòng: `Nhãn - URL` hoặc URL.
 */
export default function HeThongBaiTapLoiSaiList({
  raw,
}: {
  raw: string | null;
}) {
  const entries = parseVideoBaiGiangEntries(raw);
  if (entries.length === 0) return null;

  return (
    <ul className="htbt-ls-scroll" role="list">
      {entries.map((e, i) => {
        const title = e.label.trim() || `Lỗi ${i + 1}`;
        return (
          <li key={`${e.embed}-${i}`} className="htbt-ls-item">
            <div className="htbt-ls-frame">
              <iframe
                className="htbt-ls-iframe"
                src={e.embed}
                title={title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="htbt-ls-cap" title={title}>
              {title}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
