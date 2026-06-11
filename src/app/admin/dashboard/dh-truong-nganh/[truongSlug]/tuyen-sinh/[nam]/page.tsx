import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ truongSlug: string; nam: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** URL cũ `/tuyen-sinh/[nam]` → trang trường gom chung với `?nam=`. */
export default async function DhTuyenSinhNamRedirectPage({ params, searchParams }: Props) {
  const { truongSlug, nam } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  qs.set("nam", String(nam).trim());
  const page = sp.page;
  if (page != null && !Array.isArray(page) && String(page).trim() !== "") {
    qs.set("page", String(page).trim());
  }

  redirect(`/admin/dashboard/dh-truong-nganh/${truongSlug}?${qs.toString()}`);
}
