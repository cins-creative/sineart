import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchAgentOperationalCatalog } from "@/lib/agent/agent-operational-catalog";
import { fetchConsultantInstructionsSafe } from "@/lib/agent/consultant-config";
import {
  buildDhMonThiSampleImageUrls,
  getPublicSiteBaseUrl,
} from "@/lib/agent/dh-mon-thi-sample-images";
import {
  fetchDhAgentUniversityCatalogForPrompt,
  type DhAgentUniversityCatalogResult,
} from "@/lib/agent/dh-agent-university-catalog";
import {
  fetchDhExamProfilesSafe,
  formatDhExamProfilesForPrompt,
} from "@/lib/agent/dh-exam-profiles";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── SYSTEM PROMPT ─────────────────────────────────────────────
// Tư vấn viên chỉnh sửa phần này để thay đổi cách agent nói chuyện
// Không cần động vào Worker Cloudflare
const SYSTEM_PROMPT = `Bạn là Sine — tư vấn Sine Art (mỹ thuật, TP.HCM).

Tuyệt đối: chỉ tiếng Việt; không markdown (** …); tin ngắn 2–3 câu; không nói là AI/bot; không hứa giảm giá ngoài data train; không bịa — thiếu thì hỏi lại hoặc nhờ nhân viên.
Ảnh: minh họa môn ĐH (/img/dh-mon-thi/) hoặc ảnh/link KB chỉ khi HV xin mẫu / nhầm trường–ngành–môn hoặc FAQ khớp có attachment; giải thích từng ảnh; không chèn URL trong chữ tin.

Thiếu KB / không chắc khóa: “để mình kiểm tra” + hỏi rõ — không đoán giá/lịch/ảnh khóa khác.

Nguồn (ưu tiên): (1) DỮ LIỆU VẬN HÀNH — giá, lịch lớp, chi nhánh, môn; (2) KB — chỉ mục khớp đúng (không gộp nhầm khóa); (3) ĐỀ THI ĐH + mốc TS rút gọn — không suy diễn; (4) tool query_courses; không có → kiểm tra / escalate.

Địa điểm: hai chi nhánh Tân Phú & Bình Thạnh — địa chỉ/SĐT trong khối vận hành. Gần ĐH Mỹ thuật → Bình Thạnh; khu Tây/Tân Phú → Tân Phú. Chưa rõ khu → hỏi quận. Khối “GỢI Ý KHOẢNG CÁCH” (nếu có): ưu tiên chi gần hơn; địa chỉ vẫn lấy đúng dòng chi nhánh. Online chỉ khi HV hỏi online.

Giọng Zalo: mình/bạn, gọn; tránh “Theo thông tin”, “Rất vui hỗ trợ”. “Kiểm tra lại” chỉ khi thiếu data.

Đăng ký: đã chốt khóa → get_payment_link → gửi link.

Escalate: giảm phí/HB đặc biệt; khiếu nại/tức giận; VAT/HĐ; quá phức tạp.`;

const MAX_CONSULTANT_INSTRUCTIONS_CHARS = 2500;

/** Ghép prompt cố định trong code + nội dung do TVV nhập trên admin (`ag_agent_config`). */
function buildFullSystemPrompt(consultantExtra: string | null | undefined): string {
  let t = (consultantExtra ?? "").trim();
  if (t.length > MAX_CONSULTANT_INSTRUCTIONS_CHARS) {
    t = `${t.slice(0, MAX_CONSULTANT_INSTRUCTIONS_CHARS)}…`;
  }
  if (!t) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n─── TVV ───\n${t}`;
}

function buildSystemPromptWithExam(
  consultantExtra: string | null | undefined,
  examFormatted: string,
  operationalCatalog: string,
  dhUniversityCatalog: string,
): string {
  let s = buildFullSystemPrompt(consultantExtra);
  const op = operationalCatalog.trim();
  if (op) {
    s = `${s}\n\n─── VẬN HÀNH ───\n${op}`;
  }
  const exam = examFormatted.trim();
  if (exam) {
    s = `${s}\n\n─── ĐỀ THI ĐH (trường×ngành) ───\n${exam}`;
  }
  const dhUni = dhUniversityCatalog.trim();
  if (dhUni) {
    s = `${s}\n\n─── MỐC TS (rút gọn) ───\n${dhUni}`;
  }
  return s;
}

// ── API HANDLER ───────────────────────────────────────────────
/** `compact=1`: bỏ khối danh mục trường/ngành + mốc lịch (rất dài) — dùng chat thử admin để tránh vượt context API. Cặp trường–ngành trong «ĐỀ THI ĐH» vẫn đầy đủ. */
export async function GET(req: Request) {
  const compact = new URL(req.url).searchParams.get("compact") === "1";

  // KB + catalog vận hành (ql_chi_nhanh, ql_mon_hoc, ql_lop_hoc, hp gói học phí) + đề thi ĐH
  // `ag_agent_config` đọc riêng — nếu chưa migration thì không làm fail cả API.
  const [{ data: kb }, consultant, examProfiles, operational, dhUniCatalog] = await Promise.all([
    supabase
      .from("ag_knowledge_base")
      .select("question, answer, category, priority, attachments")
      .eq("active", true)
      .order("priority", { ascending: false })
      .limit(40),

    fetchConsultantInstructionsSafe(supabase),
    fetchDhExamProfilesSafe(supabase),
    fetchAgentOperationalCatalog(supabase),
    compact ?
      Promise.resolve({
        promptAppend: "",
        warnings: [],
      } satisfies DhAgentUniversityCatalogResult)
    : fetchDhAgentUniversityCatalogForPrompt(supabase),
  ]);

  const consultantExtra = consultant.text.trim();
  const examFormatted = formatDhExamProfilesForPrompt(examProfiles);
  const dhMonThiSampleImageUrls = buildDhMonThiSampleImageUrls(getPublicSiteBaseUrl());

  return NextResponse.json(
    {
      updated: new Date().toISOString(),
      system_prompt: buildSystemPromptWithExam(
        consultantExtra,
        examFormatted,
        operational.promptAppend,
        dhUniCatalog.promptAppend,
      ),
      consultant_instructions: consultantExtra || null,
      dh_exam_profiles: examProfiles,
      dh_mon_thi_sample_image_urls: dhMonThiSampleImageUrls,
      faq: kb ?? [],
      available_classes: operational.available_classes,
      operational_load_warnings: operational.loadWarnings.length ? operational.loadWarnings : undefined,
      dh_university_load_warnings:
        dhUniCatalog.warnings.length > 0 ? dhUniCatalog.warnings : undefined,
      compact_mode: compact ? true : undefined,
    },
    {
      headers: {
        // KB đổi thường xuyên — không để CDN/WAF cache body cũ (Worker Messenger fetch sẽ nhận FAQ lệch).
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
