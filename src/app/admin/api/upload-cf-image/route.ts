import { handleAdminCfImageUpload } from "@/lib/admin/cf-image-upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleAdminCfImageUpload(req);
}
