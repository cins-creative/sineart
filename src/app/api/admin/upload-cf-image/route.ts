import { handleAdminCfImageUpload } from "@/lib/admin/cf-image-upload";

export const runtime = "nodejs";

/** Giữ route cũ; cookie `path: /admin` không gửi tới `/api/*` — client dùng `/admin/api/upload-cf-image`. */
export async function POST(req: Request) {
  return handleAdminCfImageUpload(req);
}
