import { SITE_LOGO_URL, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

function sineArtOrg(): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: "Sine Art",
    url: SITE_ORIGIN,
    logo: { "@type": "ImageObject", url: SITE_LOGO_URL },
  };
}

export function buildDhTruongCollegeJsonLd(args: {
  tenTruong: string;
  moTa: string | null;
  website: string | null;
  diaChi: string | null;
  imageUrl: string | null;
  pageUrl: string;
}): Record<string, unknown> {
  const official = args.website?.trim() || "";
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: args.tenTruong,
    url: official || args.pageUrl,
  };
  if (args.moTa?.trim()) out.description = args.moTa.trim();
  if (official && official !== args.pageUrl) {
    out.sameAs = [official];
  }
  if (args.diaChi?.trim()) {
    out.address = {
      "@type": "PostalAddress",
      streetAddress: args.diaChi.trim(),
      addressCountry: "VN",
    };
  }
  if (args.imageUrl?.trim()) out.image = args.imageUrl.trim();
  return out;
}

export function buildDhTruongDatasetJsonLd(args: {
  tenTruong: string;
  pageUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Điểm chuẩn ${args.tenTruong}`,
    description: `Bảng điểm chuẩn các ngành tại ${args.tenTruong} qua các năm`,
    url: args.pageUrl,
    creator: sineArtOrg(),
    keywords: `điểm chuẩn, ${args.tenTruong}, tuyển sinh`,
    variableMeasured: "Điểm chuẩn xét tuyển đại học",
  };
}

export function buildDhTruongBreadcrumbJsonLd(args: {
  tenTruong: string;
  pageUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Thông tin đại học",
        item: `${SITE_ORIGIN}/tra-cuu-thong-tin`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: args.tenTruong,
        item: args.pageUrl,
      },
    ],
  };
}

export function buildDhNganhDatasetJsonLd(args: {
  tenNganh: string;
  tenTruong: string;
  pageUrl: string;
  namMin: number;
  namMax: number;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Điểm chuẩn ${args.tenNganh} — ${args.tenTruong}`,
    description: `Lịch sử điểm chuẩn ngành ${args.tenNganh} tại ${args.tenTruong} từ ${args.namMin} đến ${args.namMax}`,
    url: args.pageUrl,
    creator: sineArtOrg(),
    variableMeasured: "Điểm chuẩn xét tuyển đại học",
    temporalCoverage: `${args.namMin}/${args.namMax}`,
    keywords: `điểm chuẩn, ${args.tenNganh}, ${args.tenTruong}`,
  };
}

export function buildDhNganhBreadcrumbJsonLd(args: {
  tenTruong: string;
  tenNganh: string;
  truongPageUrl: string;
  pageUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Thông tin đại học",
        item: `${SITE_ORIGIN}/tra-cuu-thong-tin`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: args.tenTruong,
        item: args.truongPageUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: args.tenNganh,
        item: args.pageUrl,
      },
    ],
  };
}
