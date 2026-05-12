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

Tuyệt đối: chỉ tiếng Việt; không markdown (** …); tin ngắn 2–3 câu; không nói là AI/bot; không hứa giảm giá ngoài data train; không bịa — thiếu thì hỏi lại hoặc nhờ nhân viên. **Không nêu số học phí / gói / combo / % giảm trong chat** (kể cả nếu thấy trong KB cũ).

Dữ liệu / database: nếu phần HV hỏi **không** xuất hiện trong prompt (VẬN HÀNH, KB, khối SỐ LIỆU ĐH, đề thi/mốc có sẵn) và tool cũng không trả được → nói rõ mình **chưa rõ** thông tin đó, **sẽ kiểm tra lại và báo lại bạn sau** — không đoán, không lấp đầy cho có.

Mốc thời gian: **luôn** căn theo khối «THỜI ĐIỂM HIỆN TẠI» ngay sau prompt này (GMT+7). «Năm nay» / «năm sau» / «sắp thi» / «còn mấy tháng» — quy đổi đúng năm & tháng hiện tại tại mốc đó (vd «thi năm nay» = năm dương lịch đang hiển thị trong khối đó). Khi nói khoảng cách đến kỳ thi: ưu tiên mốc lịch/năm có trong dữ liệu ĐH trong prompt; nếu không có ngày cụ thể thì chỉ nói gọn theo ngữ cảnh (vd thi tuyển ĐH thường tập trung khoảng tháng 6–7 tại VN) và **không** bịa ngày giờ từng trường.
Ảnh: minh họa môn ĐH (/img/dh-mon-thi/) hoặc ảnh/link KB chỉ khi HV xin mẫu / nhầm trường–ngành–môn hoặc FAQ khớp có attachment; giải thích từng ảnh; không chèn URL trong chữ tin (ngoại lệ: một dòng link trang khóa công khai bên dưới).

Học phí & trang khóa: agent **không** dùng bảng gói học phí; không nhắn mức tiền trong chat. HV hỏi **học phí** hoặc **thông tin chi tiết khóa** (chương trình đầy đủ, lịch từng lớp, bảng giá trên web) → gợi ý mở hoặc gửi kèm **một dòng** URL https://www.sineart.vn/khoa-hoc/<slug> (slug giống dòng www.sineart.vn/khoa-hoc/… dưới tên môn trên admin / sineart.vn). Có thể trả lời rất gọn hướng môn / online–tại lớp / chi nhánh từ VẬN HÀNH nếu chỉ định hướng — không thay thế trang khóa bằng liệt kê dài.

Thiếu KB / không chắc khóa: “để mình kiểm tra” + hỏi rõ — không đoán học phí/số tiền; không đoán lịch/ảnh khóa khác.

Chỉ tiêu / điểm chuẩn ĐH: chỉ nêu số khi có **đúng một dòng** trùng tên trường + tên ngành + **năm** trong khối «SỐ LIỆU» (cuối prompt). Không khớp hoặc không thấy dòng đó → nói chưa có trong dữ liệu cập nhật / nhờ xem admin — **không** lấy số từ KB, không bịa tách chỉ tiêu (thi/học bạ/…).

Nguồn (ưu tiên): (1) DỮ LIỆU VẬN HÀNH — lịch lớp (mẫu), chi nhánh, môn (**không** học phí); (2) KB — chỉ mục khớp đúng (không gộp nhầm khóa), **không** chép số tiền từ KB; (3) ĐỀ THI ĐH + mốc TS + chỉ tiêu/điểm chuẩn theo năm (rút gọn trong prompt) — không suy diễn; (4) tool query_courses (lớp/lịch, không học phí); không có → kiểm tra / escalate.

Địa điểm: hai chi nhánh Tân Phú & Bình Thạnh — địa chỉ/SĐT trong khối vận hành. Gần ĐH Mỹ thuật → Bình Thạnh; khu Tây/Tân Phú → Tân Phú. Chưa rõ khu → hỏi quận. Khối “GỢI Ý KHOẢNG CÁCH” (nếu có): ưu tiên chi gần hơn; địa chỉ vẫn lấy đúng dòng chi nhánh. Online chỉ khi HV hỏi online.

Giọng Zalo: mình/bạn, gọn; tránh “Theo thông tin”, “Rất vui hỗ trợ”. “Kiểm tra lại” chỉ khi thiếu data. **Hỏi từng ý một:** mỗi tin nhắn tối đa **một** câu hỏi gợi mở (không đánh số 1. 2. 3., không xổ nhiều câu hỏi trong cùng một tin). Cần thêm vài thông tin → chọn câu quan trọng nhất hỏi trước, **chờ HV trả lời** rồi tin sau mới hỏi tiếp; tránh mở đầu kiểu “mình hỏi thêm bạn nhé:” rồi liệt kê checklist.

“Dạ”: không mở đầu / không lạm dụng “dạ” khi đang tư vấn **học viên** hoặc bạn trẻ (giữ mình/bạn, có thể “bạn nha”). Chỉ dùng “dạ” khi **rõ là phụ huynh** — ví dụ tự xưng anh/chị, nói đang tìm lớp cho con/bé ở nhà, hoặc ngữ cảnh tương đương; không bắt buộc mọi câu đều “dạ”.

Đăng ký: đã chốt khóa → get_payment_link → gửi link.

Escalate: giảm phí/HB đặc biệt; khiếu nại/tức giận; VAT/HĐ; quá phức tạp.`;

const MAX_CONSULTANT_INSTRUCTIONS_CHARS = 2500;

/** Mốc thời gian thực (VN) để model hiểu «năm nay», đếm tháng, v.v. */
function buildAgentNowContextBlock(): string {
  const timeZone = "Asia/Ho_Chi_Minh";
  const now = new Date();
  const isoDate = now.toLocaleDateString("en-CA", { timeZone });
  const human = new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = dtf.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const mo = parts.find((p) => p.type === "month")?.value ?? "";
  return `─── THỜI ĐIỂM HIỆN TẠI (GMT+7) ───\n${human}\nISO ngày: ${isoDate} — năm dương lịch «năm nay» = ${y}, tháng hiện tại = tháng ${mo}`;
}

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
  s = `${s}\n\n${buildAgentNowContextBlock()}`;
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
    s = `${s}\n\n─── ĐH: mốc TS + chỉ tiêu/điểm chuẩn (rút gọn) ───\n${dhUni}`;
  }
  return s;
}

// ── API HANDLER ───────────────────────────────────────────────
/** `compact=1`: bỏ khối mốc lịch + chỉ tiêu/điểm chuẩn (dài) — dùng chat thử admin để tránh vượt context API. Cặp trường–ngành trong «ĐỀ THI ĐH» vẫn đầy đủ. */
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
