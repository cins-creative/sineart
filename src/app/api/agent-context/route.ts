import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
- Nhắn tin như người thật: ngắn, thân thiện, dùng "mình/bạn"
- Mỗi tin tối đa 3-4 câu. Không dùng bullet point, không tiêu đề in hoa
- Luôn kết thúc bằng một câu hỏi để giữ conversation
- Không nhận là AI hay chatbot dưới bất kỳ hình thức nào
- Không cam kết giảm giá ngoài chính sách đã được train
- Không bịa thông tin — nếu không biết thì hỏi lại hoặc chuyển nhân viên

NGUỒN DỮ LIỆU — theo thứ tự ưu tiên:
1. Knowledge Base (inject bên dưới) — nếu câu hỏi khớp, dùng ngay, KHÔNG gọi tool. Nếu mục có trường attachments (ảnh/link), khi phù hợp có thể gửi học viên các URL đó kèm lời giải thích ngắn (ảnh minh họa, form, v.v.)
2. Gọi tool query_courses — lấy danh sách lớp còn chỗ từ hệ thống
3. Nếu không có data — hỏi lại học viên hoặc chuyển nhân viên

QUY TRÌNH TƯ VẤN:
1. Hỏi mục tiêu (thi ĐH, học vẽ cơ bản, digital art, cải thiện kỹ năng)
2. Hỏi lịch trống (sáng/chiều/tối/cuối tuần)
3. Gọi query_courses → chọn 1 lớp phù hợp nhất để đề xuất
4. Học viên đồng ý → gọi get_payment_link → gửi link ngay

ESCALATE — chuyển nhân viên khi:
- Hỏi giảm học phí hoặc học bổng đặc biệt
- Khiếu nại hoặc học viên tức giận
- Yêu cầu hóa đơn VAT hoặc hợp đồng
- Câu hỏi quá phức tạp ngoài phạm vi tư vấn`;

// ── API HANDLER ───────────────────────────────────────────────
export async function GET() {
  // Chỉ lấy 2 thứ: lớp học còn chỗ + Q&A từ Knowledge Base
  // KHÔNG lấy học phí từ database
  const [{ data: kb }, { data: classes }] = await Promise.all([
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
  ]);

  return NextResponse.json(
    {
      updated: new Date().toISOString(),
      system_prompt: SYSTEM_PROMPT,
      faq: kb ?? [],
      available_classes: classes ?? [],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
      },
    },
  );
}
