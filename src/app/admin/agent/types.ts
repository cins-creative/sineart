import type { KbAttachments } from "@/app/admin/agent/knowledge-attachments";

export type AgKnowledgeRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  priority: string;
  active: boolean;
  created_at: string;
  /** Đính kèm tùy chọn — URL ảnh + link tham chiếu (jsonb trên Supabase). */
  attachments?: KbAttachments | null;
};
