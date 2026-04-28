import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Đọc hướng dẫn TVV từ `ag_agent_config`. Nếu bảng chưa migration / lỗi — trả rỗng, không ném lỗi.
 */
export async function fetchConsultantInstructionsSafe(
  supabase: SupabaseClient,
): Promise<{ text: string; updatedAt: string | null }> {
  try {
    const { data, error } = await supabase
      .from("ag_agent_config")
      .select("consultant_instructions, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) return { text: "", updatedAt: null };
    if (!data) return { text: "", updatedAt: null };
    return {
      text:
        data.consultant_instructions != null ? String(data.consultant_instructions) : "",
      updatedAt: data.updated_at != null ? String(data.updated_at) : null,
    };
  } catch {
    return { text: "", updatedAt: null };
  }
}
