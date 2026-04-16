import Link from "next/link";

import AdminPasswordTokenForm from "@/app/admin/_components/AdminPasswordTokenForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AdminSetupPage({ searchParams }: Props) {
  const { token: raw } = await searchParams;
  const token = typeof raw === "string" ? raw.trim() : "";
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] px-4 text-center text-[#fca5a5] [font-family:ui-sans-serif,system-ui,sans-serif]">
        <p className="mb-4">Thiếu liên kết đặt mật khẩu.</p>
        <Link href="/admin/forgot" className="text-[#fdba74] underline">
          Gửi email đặt mật khẩu
        </Link>
      </div>
    );
  }

  return (
    <AdminPasswordTokenForm
      token={token}
      title="Đặt mật khẩu lần đầu"
      subtitle="Tạo mật khẩu để đăng nhập khu vực quản trị."
    />
  );
}
