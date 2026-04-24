import Link from "next/link";

import { fetchAllArticlesForIndex } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library Editor — Sine Art Admin" };

const GROUP_COLORS: Record<string, string> = {
  "Cơ sở tạo hình": "#ee5b9f",
  "Hình họa": "#f8a668",
  "Bố cục màu": "#6ec6f5",
  "Trang trí màu": "#7ecb8f",
};

export default async function AdminLibraryIndexPage() {
  const articles = await fetchAllArticlesForIndex();

  // Group by thuoc_nhom
  const groups: Record<
    string,
    { id: number; ten_ly_thuyet: string; slug: string | null }[]
  > = {};
  for (const a of articles) {
    const g = a.thuoc_nhom ?? "Chưa phân loại";
    if (!groups[g]) groups[g] = [];
    groups[g].push(a);
  }

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "3rem 2rem 6rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#2d2020",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Library HTML Editor
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
          Chọn bài để mở editor · Sửa HTML → Save → trang public cập nhật ngay
        </p>
        <a
          href="/admin/dashboard/library/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            padding: "8px 16px",
            borderRadius: 8,
            background: "#2d2020",
            color: "#f8a668",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: 0.2,
          }}
        >
          + Paste &amp; Edit (không cần chọn bài)
        </a>
      </div>

      {articles.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            background: "#fff8f0",
            borderRadius: 12,
            color: "#c84b00",
            fontSize: 14,
            border: "1px solid #fde8d0",
          }}
        >
          Không tải được danh sách bài — kiểm tra{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> trong <code>.env.local</code>.
        </div>
      ) : (
        Object.entries(groups).map(([group, items]) => {
          const accent = GROUP_COLORS[group] ?? "#a0a0a0";
          return (
            <div key={group} style={{ marginBottom: "2.5rem" }}>
              {/* Group label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: accent,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#888",
                  }}
                >
                  {group}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#bbb",
                    background: "#f4ede4",
                    borderRadius: 20,
                    padding: "1px 8px",
                  }}
                >
                  {items.length} bài
                </span>
              </div>

              {/* Article list */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {items.map((item) =>
                  item.slug ? (
                    <Link
                      key={item.id}
                      href={`/admin/dashboard/library/${item.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "#faf7f4",
                        textDecoration: "none",
                        color: "#2d2020",
                        border: "1px solid #ede6de",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <span
                        style={{
                          width: 3,
                          height: 20,
                          borderRadius: 2,
                          background: accent,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          flex: 1,
                        }}
                      >
                        {item.ten_ly_thuyet}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#bbb",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.slug}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          background: "#2d2020",
                          color: "#faf7f2",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Sửa →
                      </span>
                    </Link>
                  ) : (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "#f8f8f8",
                        color: "#bbb",
                        border: "1px dashed #e0e0e0",
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 3,
                          height: 20,
                          borderRadius: 2,
                          background: "#ddd",
                          flexShrink: 0,
                        }}
                      />
                      {item.ten_ly_thuyet}
                      <span style={{ fontSize: 11, marginLeft: "auto" }}>
                        Chưa có slug
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
