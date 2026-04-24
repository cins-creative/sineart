"use server";

import { revalidatePath } from "next/cache";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Lưu `content` HTML vào Supabase và revalidate trang public.
 * Dùng service-role client để bypass RLS (admin only).
 */
export async function saveLibraryContent(
  slug: string,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      success: false,
      error:
        "Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local — không thể lưu.",
    };
  }

  const { error } = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .update({ content })
    .eq("slug", slug);

  if (error) return { success: false, error: error.message };

  // Clear ISR cache để trang public cập nhật ngay
  revalidatePath(`/kien-thuc-nen-tang/${slug}`);
  revalidatePath("/kien-thuc-nen-tang");

  return { success: true };
}

/** Fetch 1 bài theo slug cho editor page. */
export async function fetchArticleForEditor(slug: string): Promise<{
  id: number;
  ten_ly_thuyet: string;
  slug: string;
  thuoc_nhom: string | null;
  content: string | null;
  short_content: string | null;
} | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .select("id, ten_ly_thuyet, slug, thuoc_nhom, content, short_content")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: number;
    ten_ly_thuyet: string;
    slug: string;
    thuoc_nhom: string | null;
    content: string | null;
    short_content: string | null;
  };
}

/** Fetch danh sách bài cho index page. */
export async function fetchAllArticlesForIndex(): Promise<
  {
    id: number;
    ten_ly_thuyet: string;
    slug: string | null;
    thuoc_nhom: string | null;
  }[]
> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .select("id, ten_ly_thuyet, slug, thuoc_nhom")
    .order("thuoc_nhom", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("[library/index] fetchAllArticlesForIndex:", error.message);
    return [];
  }
  return (data ?? []) as {
    id: number;
    ten_ly_thuyet: string;
    slug: string | null;
    thuoc_nhom: string | null;
  }[];
}
