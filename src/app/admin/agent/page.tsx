import { redirect } from "next/navigation";

import AgentConsultView from "@/app/admin/agent/AgentConsultView";
import { adminStaffCanAccessAgentPage } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { parseKbAttachments } from "@/app/admin/agent/knowledge-attachments";
import type { AgKnowledgeRow } from "@/app/admin/agent/types";
import { fetchConsultantInstructionsSafe } from "@/lib/agent/consultant-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminAgentPage() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được Knowledge Base.
      </div>
    );
  }

  const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  if (!adminStaffCanAccessAgentPage(profile.vai_tro)) {
    redirect("/admin/dashboard/overview");
  }

  const { data, error } = await supabase
    .from("ag_knowledge_base")
    .select("id, question, answer, category, priority, active, created_at, attachments")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được Knowledge Base: {error.message}
      </div>
    );
  }

  const initialRows: AgKnowledgeRow[] = (data ?? []).map((row) => ({
    ...(row as AgKnowledgeRow),
    attachments: parseKbAttachments(
      (row as { attachments?: unknown }).attachments,
    ),
  }));

  const consultantRow = await fetchConsultantInstructionsSafe(supabase);
  const initialConsultantInstructions = consultantRow.text;
  const consultantInstructionsUpdatedAt = consultantRow.updatedAt;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentConsultView
        initialRows={initialRows}
        initialConsultantInstructions={initialConsultantInstructions}
        consultantInstructionsUpdatedAt={consultantInstructionsUpdatedAt}
      />
    </div>
  );
}
