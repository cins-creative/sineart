import Link from "next/link";
import { notFound } from "next/navigation";

import LibraryEditor from "@/components/admin/LibraryEditor";

import { fetchArticleForEditor } from "../actions";

import "../../../../kien-thuc-nen-tang/kien-thuc-library.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Edit: ${slug} — Sine Art Admin` };
}

export default async function AdminLibraryEditorPage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticleForEditor(slug);
  if (!article) notFound();

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
      {/* ── TOP HEADER ────────────────────────────────────────── */}
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
        <Link
          href="/admin/dashboard/library"
          style={{
            color: "#f8a668",
            fontSize: 13,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Danh sách
        </Link>
        <span style={{ color: "#4d3030", fontSize: 16 }}>|</span>
        {article.thuoc_nhom ? (
          <span style={{ fontSize: 12, color: "#a0887a", fontWeight: 500 }}>
            {article.thuoc_nhom}
          </span>
        ) : null}
        <strong style={{ fontSize: 15, color: "#faf7f2", letterSpacing: -0.2 }}>
          {article.ten_ly_thuyet}
        </strong>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#7a6060",
            fontFamily: "monospace",
          }}
        >
          slug: {article.slug}
        </span>
      </div>

      {/* ── EDITOR ────────────────────────────────────────────── */}
      <LibraryEditor
        slug={article.slug}
        initialContent={article.content ?? ""}
        title={article.ten_ly_thuyet}
      />
    </div>
  );
}
