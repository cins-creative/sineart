import LibraryEditor from "@/components/admin/LibraryEditor";

import "../../../../../kien-thuc-nen-tang/kien-thuc-library.css";

export const metadata = { title: "Paste & Edit HTML — Sine Art Admin" };

/**
 * Standalone editor — không fetch Supabase.
 * Workflow: paste HTML vào Monaco → sửa → preview → copy → paste vào Supabase.
 */
export default function LibraryNewPage() {
  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        background: "#1e1e1e",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 20px",
          background: "#2d2020",
          color: "#faf7f2",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          borderBottom: "1px solid #3d3030",
        }}
      >
        <a
          href="/admin/dashboard/library"
          style={{ color: "#f8a668", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
        >
          ← Danh sách
        </a>
        <span style={{ color: "#4d3030", fontSize: 16 }}>|</span>
        <strong style={{ fontSize: 15, color: "#faf7f2" }}>
          Paste &amp; Edit
        </strong>
        <span style={{ fontSize: 12, color: "#a0887a", marginLeft: 4 }}>
          — paste HTML vào editor · sửa · copy · dán vào Supabase
        </span>
      </div>

      {/* slug="__paste__" → Save bị disable, chỉ dùng Copy */}
      <LibraryEditor
        slug="__paste__"
        initialContent=""
        title="Paste mode"
        pasteMode
      />
    </div>
  );
}
