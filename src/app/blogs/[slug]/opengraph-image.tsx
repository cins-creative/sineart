import { ImageResponse } from "next/og";

import { fetchBlogById, idFromBlogSlug } from "@/lib/data/blog";

export const runtime = "edge";

export const alt = "";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

async function loadBeVietnamBold(): Promise<ArrayBuffer | undefined> {
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700&display=swap&subset=latin,vietnamese"
    );
    const css = await cssRes.text();
    const m = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
    if (!m?.[1]) return undefined;
    const fontUrl = m[1].replace(/["']/g, "").trim();
    const fontRes = await fetch(fontUrl);
    return fontRes.arrayBuffer();
  } catch {
    return undefined;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromBlogSlug(slug);
  const post = id ? await fetchBlogById(id) : null;
  const title = post?.title?.trim() || "Sine Art Blog";
  const fontData = await loadBeVietnamBold();

  const fonts =
    fontData != null
      ? ([
          {
            name: "Be Vietnam Pro",
            data: fontData,
            style: "normal" as const,
            weight: 700 as const,
          },
        ] as const)
      : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 72,
          background: "linear-gradient(135deg, #f8a668 0%, #ee5b9f 100%)",
          fontFamily: fonts ? "Be Vietnam Pro" : "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: title.length > 80 ? 42 : 56,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.25,
            maxHeight: 420,
            overflow: "hidden",
            textShadow: "0 2px 24px rgba(0,0,0,0.12)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 56,
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.02em",
          }}
        >
          sineart.vn
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts ? [...fonts] : undefined,
    }
  );
}
