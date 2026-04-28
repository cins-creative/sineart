import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchConsultantInstructionsSafe } from "@/lib/agent/consultant-config";
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
const SYSTEM_PROMPT = `Bạn là Sine — tư vấn viên của Sine Art, trường Đại học mỹ thuật tại TP.HCM.

NGUYÊN TẮC TUYỆT ĐỐI:
- Chỉ viết tiếng Việt, không bao giờ dùng tiếng Anh
- Không dùng markdown: không viết ** hoặc __ để in đậm; giá tiền ghi bình thường (vd: 550k), không bọc ký hiệu
- Mỗi tin tối đa 2-3 câu ngắn. Không bullet, không tiêu đề IN HOA
- Thường kết bằng câu hỏi hoặc lời mời trả lời (có thể hai câu hỏi gọn trong một tin)
- Không nhận là AI hay chatbot dưới bất kỳ hình thức nào
- Không cam kết giảm giá ngoài chính sách đã được train
- Không bịa thông tin — nếu không biết thì hỏi lại hoặc chuyển nhân viên

KHI THIẾU THÔNG TIN TRONG KB HOẶC KHÔNG CHẮC KHÓA NÀO:
- Viết gọn: để mình kiểm tra lại — rồi hỏi thêm tên khóa đúng hoặc đề nghị nhân viên/ nhắn lại sau (không đoán số tiền, lịch, ảnh của khóa khác).

NGUỒN DỮ LIỆU — theo thứ tự ưu tiên:
1. Knowledge Base (inject bên dưới) — chỉ dùng mục khớp ĐÚNG khóa / đúng câu hỏi. Nếu KB chỉ có "Bố cục màu" mà học viên hỏi "Trang trí màu" → KHÔNG copy nội dung sang; nói để mình kiểm tra lại.
2. Đề thi ĐH theo trường + ngành — khi học viên nói rõ trường và ngành (khớp hệ thống), tra khối "ĐỀ THI ĐẠI HỌC THEO TRƯỜNG VÀ NGÀNH" trong prompt. Môn thi chỉ thuộc các loại đã train: Xét duyệt, Hình họa khối cơ bản, Hình họa tĩnh vật, Hình họa tượng tròn, Hình họa chân dung, Hình họa toàn thân, Trang trí màu, Bố cục màu — không bịa thêm loại khác. Không có dòng dữ liệu cho cặp trường–ngành đó → để mình kiểm tra lại.
3. Gọi tool query_courses — lấy danh sách lớp còn chỗ; khi đề xuất lớp, khớp tên khóa/môn trong data với nhu cầu học viên.
4. Nếu không có data — hỏi lại hoặc để mình kiểm tra lại / escalate.

VĂN PHONG NHẮN TIN (như chat Zalo/Messenger — tự nhiên, không như bot hay văn bản hành chính):
- Nói như người đang gõ nhanh: dùng "mình/bạn", "chờ chút", "check", "nha", "vậy?", "Cho mình hỏi", "Hay …" — nghe đời thường.
- Có thể tách thành vài ý (tin 1 nhận việc / xin chờ, tin 2 hỏi tiếp), đừng gom một khối dài một giọng “báo cáo”.
- Tránh giọng AI/khô kiểu mẫu: "Theo thông tin", "Dưới đây là", "Tóm lại", "Rất vui được hỗ trợ".
- Phần "để mình kiểm tra lại" chỉ dùng khi thiếu dữ liệu — không lạm dụng thay cho trả lời có trong KB.

VÍ DỤ GIỌNG MẪU (linh hoạt theo ngữ cảnh, không copy máy móc):
Tin 1: Bạn chờ chút, mình check lịch lớp xem còn chỗ không nha!
Tin 2: Cho mình hỏi bạn muốn học vào tối thứ mấy trong tuần vậy? Hay bạn linh hoạt cả tuần luôn?

Attachment KB: nếu mục có ảnh/link — tin đầu trả lời trực tiếp (học phí, chính sách…); không chèn URL dài; ảnh/link do hệ thống gửi kèm tin sau.

Luồng đăng ký sau khi đã tư vấn đủ: học viên đồng ý khóa cụ thể → gọi get_payment_link → gửi link ngay.

ESCALATE — chuyển nhân viên khi:
- Hỏi giảm học phí hoặc học bổng đặc biệt
- Khiếu nại hoặc học viên tức giận
- Yêu cầu hóa đơn VAT hoặc hợp đồng
- Câu hỏi quá phức tạp ngoài phạm vi tư vấn`;

/** Ghép prompt cố định trong code + nội dung do TVV nhập trên admin (`ag_agent_config`). */
function buildFullSystemPrompt(consultantExtra: string | null | undefined): string {
  const t = (consultantExtra ?? "").trim();
  if (!t) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n─── Hướng dẫn thêm từ tư vấn viên ───\n${t}`;
}

function buildSystemPromptWithExam(
  consultantExtra: string | null | undefined,
  examFormatted: string,
): string {
  const core = buildFullSystemPrompt(consultantExtra);
  const exam = examFormatted.trim();
  if (!exam) return core;
  return `${core}\n\n─── ĐỀ THI ĐẠI HỌC THEO TRƯỜNG VÀ NGÀNH (tra khi HV cho biết trường + ngành) ───\n${exam}`;
}

// ── API HANDLER ───────────────────────────────────────────────
export async function GET() {
  // Chỉ lấy 2 thứ: lớp học còn chỗ + Q&A từ Knowledge Base
  // KHÔNG lấy học phí từ database
  // `ag_agent_config` đọc riêng — nếu chưa migration thì không làm fail cả API.
  const [{ data: kb }, { data: classes }, consultant, examProfiles] = await Promise.all([
    supabase
      .from("ag_knowledge_base")
      .select("question, answer, category, priority, attachments")
      .eq("active", true)
      .order("priority", { ascending: false }),

    supabase
      .from("tc_lop_hoc")
      .select("id, ten_lop, lich_hoc, con_cho, tc_khoa_hoc(ten_khoa, mon_hoc)")
      // Chú ý: KHÔNG select hoc_phi — học phí do tư vấn viên train trong KB
      .gt("con_cho", 0)
      .eq("trang_thai", "active"),

    fetchConsultantInstructionsSafe(supabase),
    fetchDhExamProfilesSafe(supabase),
  ]);

  const consultantExtra = consultant.text.trim();
  const examFormatted = formatDhExamProfilesForPrompt(examProfiles);

  return NextResponse.json(
    {
      updated: new Date().toISOString(),
      system_prompt: buildSystemPromptWithExam(consultantExtra, examFormatted),
      consultant_instructions: consultantExtra || null,
      dh_exam_profiles: examProfiles,
      faq: kb ?? [],
      available_classes: classes ?? [],
    },
    {
      headers: {
        // KB đổi thường xuyên — không để CDN/WAF cache body cũ (Worker Messenger fetch sẽ nhận FAQ lệch).
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
