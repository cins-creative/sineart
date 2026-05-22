import { permanentRedirect } from "next/navigation";
import NavBar from "@/app/_components/NavBar";
import {
  HVP_DEFAULT_PROFILE_SECTION,
  isHvpProfileSection,
  type HvpProfileSection,
} from "@/lib/hoc-vien/profile-url";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";
import { createClient } from "@/lib/supabase/server";
import HocVienProfileClient from "../profile-client";

type PageProps = {
  params: Promise<{ email: string; section: string }>;
};

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function resolveEmailFromNumericHvId(decoded: string): Promise<string | null> {
  if (!/^\d+$/.test(decoded)) return null;
  const sb = await createClient();
  if (!sb) return null;
  const { data } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("email")
    .eq("id", decoded)
    .maybeSingle();
  const row = data as { email?: string | null } | null;
  const em = row?.email != null ? String(row.email).trim().toLowerCase() : "";
  return em.includes("@") ? em : null;
}

export default async function HocVienProfileSectionPage({ params }: PageProps) {
  const { email: emailSeg, section: sectionRaw } = await params;
  const decoded = decodePathSegment(emailSeg).trim();
  const sectionDec = decodePathSegment(sectionRaw).trim().toLowerCase();

  let canonicalEmail = decoded;
  const resolved = await resolveEmailFromNumericHvId(decoded);
  if (resolved) {
    canonicalEmail = resolved;
  }

  if (!isHvpProfileSection(sectionDec)) {
    permanentRedirect(`/hoc-vien/${encodeURIComponent(canonicalEmail)}/${HVP_DEFAULT_PROFILE_SECTION}`);
  }

  const section = sectionDec as HvpProfileSection;

  if (resolved) {
    permanentRedirect(`/hoc-vien/${encodeURIComponent(resolved)}/${section}`);
  }

  const khoaHocGroups = await getKhoaHocNavGroups();

  return (
    <div className="sa-root khoa-hoc-page">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <HocVienProfileClient profileEmail={canonicalEmail} section={section} />
    </div>
  );
}
