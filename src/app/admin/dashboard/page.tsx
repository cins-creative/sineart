export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-black/85">Bảng điều khiển</h1>
      <p className="mt-2 text-sm leading-relaxed text-black/55">
        Đây là khu vực quản trị nội bộ. Các mục trong menu bên trái sẽ được nối dần với dữ liệu Supabase theo từng
        phân hệ (học viên, học phí, kho, nhân sự…).
      </p>
    </div>
  );
}
