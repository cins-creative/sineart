"use client";

import { useEffect, useState, useRef } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// ── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: number;
  project_name: string;
  project_type: string | null;
  type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  brief: string | null;
  minh_hoa: string[] | null;
  nguoi_tao: number | null;
  nguoi_lam: number[] | null;
};

// ── Config ───────────────────────────────────────────────────────────────────

const STATUS_ORDER = ["Đang làm", "Chờ xác nhận", "Hoàn thành", "Hủy dự án"];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  "Đang làm": { label: "Đang làm", color: "#3B82F6", dot: "#60A5FA" },
  "Chờ xác nhận": { label: "Chờ xác nhận", color: "#F59E0B", dot: "#FCD34D" },
  "Hoàn thành": { label: "Hoàn thành", color: "#10B981", dot: "#34D399" },
  "Hủy dự án": { label: "Hủy dự án", color: "#6B7280", dot: "#9CA3AF" },
};

const TYPE_COLOR: Record<string, string> = {
  "Album ảnh": "#F8A568",
  Ảnh: "#EE5CA2",
  "Video 16x9": "#BB89F8",
  "Short 9x16": "#818CF8",
  Web: "#34D399",
  "Micro interactive": "#FB923C",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function Tooltip({ project, x, y }: { project: Project; x: number; y: number }) {
  return (
    <div
      style={{
        position: "fixed",
        left: x + 16,
        top: y - 8,
        zIndex: 100,
        pointerEvents: "none",
        maxWidth: 280,
      }}
    >
      <div
        style={{
          background: "#0F0F0F",
          border: "1px solid #2A2A2A",
          borderRadius: 10,
          padding: "12px 14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>
          {project.type && (
            <span
              style={{
                background: `${TYPE_COLOR[project.type] ?? "#6B7280"}22`,
                color: TYPE_COLOR[project.type] || "#9CA3AF",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
              }}
            >
              {project.type}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#F3F4F6",
            lineHeight: 1.4,
            marginTop: 6,
          }}
        >
          {project.project_name}
        </div>
        {project.brief ? (
          <div
            style={{
              fontSize: 11,
              color: "#6B7280",
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project.brief}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#6B7280" }}>
          <span>▶ {formatDate(project.start_date)}</span>
          <span>⏹ {formatDate(project.end_date)}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineBar({
  project,
  timelineStart,
  totalDays,
}: {
  project: Project;
  timelineStart: Date;
  totalDays: number;
}) {
  const [hover, setHover] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const start = parseDate(project.start_date);
  const end = parseDate(project.end_date);

  const meta = STATUS_META[project.status ?? ""] ?? STATUS_META["Hoàn thành"];
  const typeColor = TYPE_COLOR[project.type ?? ""] ?? "#6B7280";

  let leftPct = 0;
  let widthPct = 2;

  if (start && end) {
    const s = Math.max(0, daysBetween(timelineStart, start));
    const e = Math.min(totalDays, daysBetween(timelineStart, end));
    leftPct = (s / totalDays) * 100;
    widthPct = Math.max(1.5, ((e - s) / totalDays) * 100);
  } else if (start) {
    const s = Math.max(0, daysBetween(timelineStart, start));
    leftPct = (s / totalDays) * 100;
    widthPct = 2;
  }

  return (
    <>
      <div
        onMouseEnter={(e) => {
          setHover(true);
          setMouse({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "absolute",
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          height: 28,
          borderRadius: 6,
          background: `linear-gradient(90deg, ${meta.color}CC, ${typeColor}99)`,
          border: `1px solid ${meta.color}55`,
          cursor: "pointer",
          transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
          transform: hover ? "scaleY(1.12)" : "scaleY(1)",
          boxShadow: hover ? `0 0 16px ${meta.color}66` : "none",
          filter: hover ? "brightness(1.2)" : "brightness(1)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          overflow: "hidden",
          whiteSpace: "nowrap",
          minWidth: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.01em",
          }}
        >
          {project.project_name}
        </span>
      </div>
      {hover ? <Tooltip project={project} x={mouse.x} y={mouse.y} /> : null}
    </>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MediaTimeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setError("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.");
          setLoading(false);
        }
        return;
      }

      const { data, error: qErr } = await supabase
        .from("mkt_quan_ly_media")
        .select("id, project_name, project_type, type, status, start_date, end_date, brief, minh_hoa, nguoi_tao, nguoi_lam")
        .order("start_date", { ascending: true });

      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }
      setProjects((data as Project[]) ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allDates = projects
    .flatMap((p) => [parseDate(p.start_date), parseDate(p.end_date)])
    .filter(Boolean) as Date[];
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

  const timelineStart = new Date(minDate);
  timelineStart.setDate(timelineStart.getDate() - 7);
  const timelineEnd = new Date(maxDate);
  timelineEnd.setDate(timelineEnd.getDate() + 7);
  const totalDays = daysBetween(timelineStart, timelineEnd) || 1;

  const monthTicks: { label: string; pct: number }[] = [];
  const cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
  while (cursor <= timelineEnd) {
    const pct = (daysBetween(timelineStart, cursor) / totalDays) * 100;
    if (pct >= 0 && pct <= 100) {
      monthTicks.push({
        label: cursor.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
        pct,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const today = new Date();
  const todayPct = (daysBetween(timelineStart, today) / totalDays) * 100;
  const showToday = todayPct >= 0 && todayPct <= 100;

  const grouped = STATUS_ORDER.reduce<Record<string, Project[]>>((acc, s) => {
    acc[s] = projects.filter((p) => p.status === s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          color: "#6B7280",
          fontFamily: "system-ui",
          fontSize: 14,
        }}
      >
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "#EF4444", fontFamily: "monospace", fontSize: 12 }}>
        Lỗi: {error}
      </div>
    );
  }

  const ROW_H = 36;
  const LABEL_W = 220;
  const TRACK_PADDING = 16;

  return (
    <div
      style={{
        fontFamily: "'Be Vietnam Pro', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
        background: "#090909",
        color: "#E5E7EB",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #1A1A1A",
        minHeight: 400,
      }}
    >
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #1A1A1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#F9FAFB",
            }}
          >
            Media timeline
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
            {projects.length} dự án · nhóm theo tình trạng · <code style={{ fontSize: 10 }}>mkt_quan_ly_media</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {STATUS_ORDER.map((s) => {
            const m = STATUS_META[s];
            const count = grouped[s]?.length ?? 0;
            if (!count) return null;
            return (
              <div
                key={s}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: m.dot,
                    display: "inline-block",
                  }}
                />
                {m.label}
                <span style={{ color: "#4B5563" }}>({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", overflow: "auto" }}>
        <div style={{ minWidth: LABEL_W, flexShrink: 0, borderRight: "1px solid #1A1A1A" }}>
          <div style={{ height: 32 }} />

          {STATUS_ORDER.map((status) => {
            const rows = grouped[status];
            if (!rows?.length) return null;
            const meta = STATUS_META[status];
            return (
              <div key={status}>
                <div
                  style={{
                    height: 28,
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#111",
                    borderTop: "1px solid #1A1A1A",
                    borderBottom: "1px solid #1A1A1A",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: meta.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: meta.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#4B5563", marginLeft: "auto" }}>{rows.length}</span>
                </div>
                {rows.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      height: ROW_H,
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "1px solid #111",
                      gap: 6,
                    }}
                  >
                    {p.type ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: TYPE_COLOR[p.type] || "#6B7280",
                          background: `${TYPE_COLOR[p.type] || "#6B7280"}18`,
                          padding: "2px 5px",
                          borderRadius: 3,
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {p.type}
                      </span>
                    ) : null}
                    <span
                      style={{
                        fontSize: 12,
                        color: "#D1D5DB",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {p.project_name}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: "auto", minWidth: 0 }} ref={trackRef}>
          <div style={{ minWidth: 700, position: "relative" }}>
            <div
              style={{
                height: 32,
                display: "flex",
                alignItems: "center",
                position: "relative",
                borderBottom: "1px solid #1A1A1A",
                background: "#0D0D0D",
              }}
            >
              {monthTicks.map((t, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${t.pct}%`,
                    fontSize: 10,
                    color: "#4B5563",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </div>
              ))}
              {showToday ? (
                <div
                  style={{
                    position: "absolute",
                    left: `${todayPct}%`,
                    top: 6,
                    fontSize: 9,
                    color: "#F8A568",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    transform: "translateX(-50%)",
                  }}
                >
                  HÔM NAY
                </div>
              ) : null}
            </div>

            {monthTicks.map((t, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${t.pct}%`,
                  top: 32,
                  bottom: 0,
                  width: 1,
                  background: "#1A1A1A",
                  pointerEvents: "none",
                }}
              />
            ))}

            {showToday ? (
              <div
                style={{
                  position: "absolute",
                  left: `${todayPct}%`,
                  top: 32,
                  bottom: 0,
                  width: 1,
                  background: "linear-gradient(180deg, #F8A568, #EE5CA222)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              />
            ) : null}

            {STATUS_ORDER.map((status) => {
              const rows = grouped[status];
              if (!rows?.length) return null;
              return (
                <div key={status}>
                  <div
                    style={{
                      height: 28,
                      borderTop: "1px solid #1A1A1A",
                      borderBottom: "1px solid #1A1A1A",
                      background: "#111",
                    }}
                  />
                  {rows.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        height: ROW_H,
                        position: "relative",
                        borderBottom: "1px solid #111",
                        padding: `${TRACK_PADDING / 2}px 0`,
                      }}
                    >
                      <TimelineBar project={p} timelineStart={timelineStart} totalDays={totalDays} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
