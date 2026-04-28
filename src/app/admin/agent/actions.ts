"use server";

import { revalidatePath } from "next/cache";

import { adminStaffCanAccessAgentPage } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { AGENT_CONSULT_HREF } from "@/lib/admin/dashboard-nav-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  parseKbAttachments,
  type KbAttachments,
} from "@/app/admin/agent/knowledge-attachments";
import {
  KB_CATEGORY_LABEL_VI,
  KB_CATEGORY_ORDER,
  type KbCategorySlug,
  isKbCategorySlug,
} from "@/app/admin/agent/knowledge-categories";

async function requireAgentSupabase() {
  const session = await getAdminSessionOrNull();
  if (!session) throw new Error("UNAUTHORIZED");

  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("NO_SUPABASE");

  const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  if (!adminStaffCanAccessAgentPage(profile.vai_tro)) throw new Error("FORBIDDEN");

  return { supabase };
}

export async function insertKnowledgeAction(input: {
  question: string;
  answer: string;
  category: string;
  priority: string;
  attachments?: KbAttachments | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAgentSupabase();
    const { error } = await supabase.from("ag_knowledge_base").insert({
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim(),
      priority: input.priority.trim(),
      active: true,
      attachments: input.attachments ?? null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(AGENT_CONSULT_HREF);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    if (msg === "UNAUTHORIZED") return { ok: false, error: "Chưa đăng nhập." };
    if (msg === "FORBIDDEN") return { ok: false, error: "Không có quyền." };
    if (msg === "NO_SUPABASE") return { ok: false, error: "Thiếu cấu hình Supabase." };
    return { ok: false, error: msg };
  }
}

export async function updateKnowledgeAction(input: {
  id: string;
  question: string;
  answer: string;
  category: string;
  priority: string;
  attachments?: KbAttachments | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAgentSupabase();
    const { error } = await supabase
      .from("ag_knowledge_base")
      .update({
        question: input.question.trim(),
        answer: input.answer.trim(),
        category: input.category.trim(),
        priority: input.priority.trim(),
        attachments: input.attachments ?? null,
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(AGENT_CONSULT_HREF);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    if (msg === "UNAUTHORIZED") return { ok: false, error: "Chưa đăng nhập." };
    if (msg === "FORBIDDEN") return { ok: false, error: "Không có quyền." };
    if (msg === "NO_SUPABASE") return { ok: false, error: "Thiếu cấu hình Supabase." };
    return { ok: false, error: msg };
  }
}

export async function softDeleteKnowledgeAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAgentSupabase();
    const { error } = await supabase.from("ag_knowledge_base").update({ active: false }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(AGENT_CONSULT_HREF);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    if (msg === "UNAUTHORIZED") return { ok: false, error: "Chưa đăng nhập." };
    if (msg === "FORBIDDEN") return { ok: false, error: "Không có quyền." };
    if (msg === "NO_SUPABASE") return { ok: false, error: "Thiếu cấu hình Supabase." };
    return { ok: false, error: msg };
  }
}

export type KnowledgeExportItemJson = {
  q: string;
  a: string;
  pri: string;
  images?: string[];
  links?: { label?: string; url: string }[];
};

export type KnowledgeExportJson = {
  version: string;
  updated: string;
  total: number;
  categories: Record<
    string,
    {
      label: string;
      items: KnowledgeExportItemJson[];
    }
  >;
};

export async function fetchActiveKnowledgeExportAction(): Promise<
  { ok: true; payload: KnowledgeExportJson } | { ok: false; error: string }
> {
  try {
    const { supabase } = await requireAgentSupabase();
    const { data, error } = await supabase
      .from("ag_knowledge_base")
      .select("question, answer, category, priority, attachments")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const rows = data ?? [];
    const categories: KnowledgeExportJson["categories"] = {};

    for (const slug of KB_CATEGORY_ORDER) {
      categories[slug] = { label: KB_CATEGORY_LABEL_VI[slug], items: [] };
    }

    for (const row of rows as {
      question: string;
      answer: string;
      category: string;
      priority: string;
      attachments?: unknown;
    }[]) {
      const raw = (row.category ?? "").trim();
      const slug: KbCategorySlug = isKbCategorySlug(raw) ? raw : "khac";
      if (!categories[slug]) {
        categories[slug] = {
          label: isKbCategorySlug(raw) ? KB_CATEGORY_LABEL_VI[slug] : "Khác",
          items: [],
        };
      }
      const att = parseKbAttachments(row.attachments);
      const item: KnowledgeExportItemJson = {
        q: row.question ?? "",
        a: row.answer ?? "",
        pri: (row.priority ?? "medium").trim() || "medium",
      };
      if (att?.images?.length) item.images = att.images;
      if (att?.links?.length) item.links = att.links;
      categories[slug].items.push(item);
    }

    const total = rows.length;
    const now = new Date();
    const updated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return {
      ok: true,
      payload: {
        version: "1.1",
        updated,
        total,
        categories,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    if (msg === "UNAUTHORIZED") return { ok: false, error: "Chưa đăng nhập." };
    if (msg === "FORBIDDEN") return { ok: false, error: "Không có quyền." };
    if (msg === "NO_SUPABASE") return { ok: false, error: "Thiếu cấu hình Supabase." };
    return { ok: false, error: msg };
  }
}

export async function saveConsultantInstructionsAction(
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAgentSupabase();
    const { error } = await supabase.from("ag_agent_config").upsert(
      {
        id: 1,
        consultant_instructions: text,
      },
      { onConflict: "id" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath(AGENT_CONSULT_HREF);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    if (msg === "UNAUTHORIZED") return { ok: false, error: "Chưa đăng nhập." };
    if (msg === "FORBIDDEN") return { ok: false, error: "Không có quyền." };
    if (msg === "NO_SUPABASE") return { ok: false, error: "Thiếu cấu hình Supabase." };
    return { ok: false, error: msg };
  }
}
