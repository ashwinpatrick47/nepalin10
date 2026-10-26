import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";

// Backs the ContactUs.tsx form — sends a direct transactional email (not
// an Audience broadcast, unlike /api/subscribe) to whoever owns the inbox
// at CONTACT_TO_EMAIL, with the submitter's name/email/message.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The "From" address on the email itself always has to be
// updates@nepalin10.com (Resend only sends from a domain you've verified —
// it can't be spoofed to the submitter's own address), which reads as
// unhelpful in an inbox. Reply-To already points at the submitter so
// hitting "reply" goes straight to them, but their name/email also need to
// be genuinely visible, not just technically present — in the subject
// line, and labelled clearly at the top of the body instead of buried in
// a plain "From: ..." text line.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; message?: string }
    | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim();
  const message = body?.message?.trim();

  if (!name || !email || !EMAIL_PATTERN.test(email) || !message) {
    return NextResponse.json(
      { error: "Fill in your name, a valid email, and a message." },
      { status: 400 },
    );
  }

  const toEmail = process.env.CONTACT_TO_EMAIL;
  if (!toEmail) {
    return NextResponse.json(
      { error: "The contact form isn't configured yet." },
      { status: 503 },
    );
  }

  let resend;
  try {
    resend = getResend();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const from = process.env.RESEND_FROM || "Nepal in 10 <updates@nepalin10.com>";
  // A pre-colored (brand pink) copy of /public/images/logo/rara.png —
  // that file is just a transparency mask meant to be recolored via CSS
  // on the site, which email clients don't support, so this is a flat
  // PNG generated from it instead, hosted on R2 alongside the videos.
  const R2_LOGO_URL = `${process.env.R2_PUBLIC_URL}/rara-pink-email.png`;

  const result = await resend.emails.send({
    from,
    to: toEmail,
    replyTo: email,
    subject: `Website contact form: ${name} (${email})`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d0f0e" style="background:#0d0f0e;">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <img src="${R2_LOGO_URL}" width="72" height="72" alt="Nepal in 10" style="display:block;width:72px;height:72px;" />
                </td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;padding:0 24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff0052;">From</p>
                  <p style="margin:0 0 24px;font-size:16px;color:#f2f3ef;">${escapeHtml(name)} &lt;<a href="mailto:${escapeHtml(email)}" style="color:#f2f3ef;">${escapeHtml(email)}</a>&gt;</p>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff0052;">Message</p>
                  <p style="margin:0 0 32px;font-size:15px;line-height:1.6;white-space:pre-wrap;color:#f2f3ef;">${escapeHtml(message)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
