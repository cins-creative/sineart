import { toPng } from "html-to-image";

/** Chụp DOM → PNG → clipboard (Zalo/Messenger: dán ảnh). */
export async function copyDomAsPngToClipboard(node: HTMLElement): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
    return { ok: false, error: "Trình duyệt không hỗ trợ ghi ảnh vào clipboard (cần HTTPS và quyền trang)." };
  }
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#f5f7f7",
    });
    const blob = await (await fetch(dataUrl)).blob();
    const type = blob.type && blob.type !== "" ? blob.type : "image/png";
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error:
        msg ||
        "Không tạo được ảnh (đôi khi do ảnh đại diện từ domain khác chặn CORS). Thử trình duyệt khác hoặc tải ảnh về.",
    };
  }
}
