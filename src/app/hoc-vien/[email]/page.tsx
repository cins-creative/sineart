import { permanentRedirect } from "next/navigation";
import { HVP_DEFAULT_PROFILE_SECTION } from "@/lib/hoc-vien/profile-url";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ email: string }>;
};

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * `/hoc-vien/{email}` → `/hoc-vien/{email}/thong-tin`
 * `/hoc-vien/{numeric-id}` → `/hoc-vien/{resolved-email}/thong-tin`
 */
export default async function HocVienProfileIndexPage({ params }: PageProps) {
  const { email: segment } = await params;
  const decoded = decodePathSegment(segment).trim();

  if (/^\d+$/.test(decoded)) {
    const sb = await createClient();
    if (sb) {
      const { data } = await sb
        .from("ql_thong_tin_hoc_vien")
        .select("email")
        .eq("id", decoded)
        .maybeSingle();
      const row = data as { email?: string | null } | null;
      const em = row?.email != null ? String(row.email).trim().toLowerCase() : "";
      if (em.includes("@")) {
        permanentRedirect(
          `/hoc-vien/${encodeURIComponent(em)}/${HVP_DEFAULT_PROFILE_SECTION}`
        );
      }
    }
  }

  permanentRedirect(
    `/hoc-vien/${encodeURIComponent(decoded)}/${HVP_DEFAULT_PROFILE_SECTION}`
  );
}
