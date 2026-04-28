import { NextResponse } from "next/server";

import {
  formatFaqRowForPrompt,
  pickMatchedFaqAttachments,
  stripMatchedImageUrlsFromText,
  stripMatchedLinkUrlsFromText,
} from "@/app/admin/agent/knowledge-attachments";
import type { DhExamProfileRow } from "@/lib/agent/dh-exam-profiles";
import {
  buildReplyPartsForChat,
  stripMarkdownBold,
} from "@/lib/agent/reply-format";
import { adminStaffCanAccessAgentPage } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-4-5";

type AgentContextPayload = {
  updated?: string;
  system_prompt?: string | null;
  faq?: {
    question?: string;
    answer?: string;
    attachments?: unknown;
  }[];
  dh_exam_profiles?: DhExamProfileRow[];
  available_classes?: unknown[];
};

function buildSystemPrompt(ctx: AgentContextPayload): string {
  const base =
    ctx.system_prompt?.trim() ||
    `Bạn là tư vấn viên Sine Art. Giọng nhắn tin Zalo: ngắn, "mình/bạn", có thể "chờ chút/check/nha". Tránh giọng AI ("Để mình check lịch..." khô; "Theo thông tin"; "Rất vui hỗ trợ"). Có thể tách vài ý: tin 1 xin chờ hoặc trả lời gọn, tin 2 hỏi tiếp cụ thể. Chỉ tiếng Việt.`;
  const noMd =
    "\n- Không dùng markdown: không viết ** in đậm, không dùng __ hoặc dấu * quanh chữ.";
  const faq = ctx.faq ?? [];
  if (faq.length === 0) {
    return `${base}${noMd}\n\n[Chế độ thử nội bộ admin: chỉ dùng thông tin bạn biết, không gọi tool.]`;
  }
  const faqText = faq.map(formatFaqRowForPrompt).join("\n\n");
  return `${base}${noMd}\n\nKNOWLEDGE BASE — ưu tiên dùng khi trả lời:\n${faqText}\n\n[Chế độ thử nội bộ admin: không gọi tool, không tạo link thanh toán.]`;
}

type HistoryTurn = { role: string; content: string };

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY — không xác minh quyền." },
      { status: 503 },
    );
  }
  const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  if (!adminStaffCanAccessAgentPage(profile.vai_tro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) {
    return NextResponse.json({ error: "Thiếu ANTHROPIC_API_KEY." }, { status: 503 });
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = (await req.json()) as { message?: unknown; history?: unknown };
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message không được để trống." }, { status: 400 });
  }

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: HistoryTurn[] = [];
  for (const item of rawHistory) {
    if (item == null || typeof item !== "object") continue;
    const o = item as { role?: unknown; content?: unknown };
    const role = o.role === "user" || o.role === "assistant" ? o.role : null;
    const content =
      typeof o.content === "string" ? o.content.trim() : "";
    if (!role || !content) continue;
    history.push({ role, content });
  }

  const origin = new URL(req.url).origin;
  const ctxRes = await fetch(`${origin}/api/agent-context`, {
    cache: "no-store",
  });
  if (!ctxRes.ok) {
    return NextResponse.json(
      { error: "Không tải được agent-context." },
      { status: 502 },
    );
  }
  const ctxData = (await ctxRes.json()) as AgentContextPayload;
  const system = buildSystemPrompt(ctxData);

  const turns = history.slice(-20);
  const anthropicMessages = [
    ...turns.map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user" as const, content: message },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic:", res.status, errText);
    return NextResponse.json(
      { error: "Agent tạm không phản hồi. Thử lại sau." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const reply =
    (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() || "…";

  const attachments = pickMatchedFaqAttachments(message, reply, ctxData.faq ?? []);

  let replyOut = reply;
  if (attachments?.images?.length) {
    replyOut = stripMatchedImageUrlsFromText(replyOut, attachments.images);
  }
  if (attachments?.links?.length) {
    replyOut = stripMatchedLinkUrlsFromText(replyOut, attachments.links);
  }
  const withoutMd = stripMarkdownBold(replyOut);
  const replyFinal = withoutMd.trim() || "…";
  const replyParts = buildReplyPartsForChat(replyFinal, attachments);

  return NextResponse.json({
    reply: replyParts.join("\n\n"),
    replyParts,
    ...(attachments ? { attachments } : {}),
  });
}
