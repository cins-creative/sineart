import { handleAdminSaoKeR2Upload } from "@/lib/admin/sao-ke-r2-upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleAdminSaoKeR2Upload(req);
}
