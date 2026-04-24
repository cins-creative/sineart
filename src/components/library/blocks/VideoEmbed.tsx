import { toEmbedUrl } from "@/lib/utils/youtube";

interface Props {
  /** YouTube URL (watch / shorts / youtu.be / embed). Auto-chuyển sang embed. */
  url: string | null | undefined;
  title?: string;
  /** Thêm `break` modifier — tràn mép, full width `.main`. Default true. */
  breakOut?: boolean;
}

/**
 * Block video nhúng YouTube với aspect 16:9 tuyệt đối + full width.
 * Scoped dưới `.ktn-lib .body .video-embed`.
 */
export default function VideoEmbed({ url, title = "Video bài giảng", breakOut = true }: Props) {
  const embed = toEmbedUrl(url ?? null);
  if (!embed) return null;

  const classes = ["bleed", breakOut ? "break" : "", "video-embed"].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <iframe
        src={embed}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
