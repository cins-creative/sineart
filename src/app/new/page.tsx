import { permanentRedirect } from "next/navigation";

/** Trang preview cũ — chuyển về trang chủ chính thức. */
export default function NewHomeRedirectPage() {
  permanentRedirect("/");
}
