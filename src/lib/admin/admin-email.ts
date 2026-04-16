import { getSiteOrigin } from "@/lib/admin/site-origin";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseResendErrorBody(errText: string): string {
  const raw = errText.trim().slice(0, 400);
  try {
    const j = JSON.parse(errText) as { message?: string };
    const m = String(j.message ?? "").trim();
    return (m || raw).slice(0, 220);
  } catch {
    return raw.slice(0, 180);
  }
}

export type AdminEmailSendResult =
  | { sent: true }
  | { sent: false; reason: string; hint?: string };

export async function sendAdminPasswordSetupEmail(params: {
  toEmail: string;
  setupUrl: string;
}): Promise<AdminEmailSendResult> {
  return sendViaResend({
    toEmail: params.toEmail,
    subject: "[Sine Art Admin] Đặt mật khẩu lần đầu",
    html: buildMailHtml({
      title: "Đặt mật khẩu tài khoản quản trị",
      intro:
        "Bạn được mời đặt mật khẩu cho tài khoản nhân sự trên hệ thống nội bộ Sine Art. Liên kết có hiệu lực trong 2 giờ.",
      ctaLabel: "Đặt mật khẩu",
      actionUrl: params.setupUrl,
    }),
  });
}

export async function sendAdminPasswordResetEmail(params: {
  toEmail: string;
  resetUrl: string;
}): Promise<AdminEmailSendResult> {
  return sendViaResend({
    toEmail: params.toEmail,
    subject: "[Sine Art Admin] Đặt lại mật khẩu",
    html: buildMailHtml({
      title: "Đặt lại mật khẩu",
      intro:
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản quản trị. Nếu không phải bạn, hãy bỏ qua email này.",
      ctaLabel: "Đặt lại mật khẩu",
      actionUrl: params.resetUrl,
    }),
  });
}

function buildMailHtml(params: {
  title: string;
  intro: string;
  ctaLabel: string;
  actionUrl: string;
}): string {
  const origin = getSiteOrigin().replace(/^https?:\/\//, "");
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);">
        <tr><td style="background:linear-gradient(135deg,#f8a668,#ee5b9f);padding:22px 26px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.92);">Sine Art</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#fff;">${escapeHtml(params.title)}</h1>
        </td></tr>
        <tr><td style="padding:24px 26px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#1a1a1a;">${escapeHtml(params.intro)}</p>
          <p style="margin:0 0 22px;text-align:center;">
            <a href="${escapeHtml(params.actionUrl)}" style="display:inline-block;padding:12px 26px;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff !important;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${escapeHtml(params.ctaLabel)}</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(0,0,0,.45);">Nếu nút không hoạt động, dán liên kết sau vào trình duyệt:<br /><span style="word-break:break-all;color:rgba(0,0,0,.55);">${escapeHtml(params.actionUrl)}</span></p>
        </td></tr>
        <tr><td style="padding:16px 26px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(0,0,0,.4);">${escapeHtml(origin)} · email tự động</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendViaResend(params: {
  toEmail: string;
  subject: string;
  html: string;
}): Promise<AdminEmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "no_resend_key" };
  }

  const fromRaw =
    process.env.RESEND_FROM?.trim() || "Sine Art <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromRaw,
        to: [params.toEmail],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const hint = parseResendErrorBody(errText) || `HTTP ${res.status}`;
      return { sent: false, reason: "resend_api", hint };
    }
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sent: false, reason: "resend_network", hint: msg.trim().slice(0, 160) };
  }
}
