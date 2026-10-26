// Sends the "Rahul started his run" email to the Resend Audience built from
// the main site's newsletter signup form (src/app/api/subscribe on the main
// site). Uses Resend's Broadcasts API (create, then send) — one call
// reaches the whole list and respects each recipient's own unsubscribe
// status, rather than looping individual sends here.
const { Resend } = require('resend');

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
// The tracker's own map page — not SITE_URL above, which is the main
// website. Defaults to the local dev server; set TRACKER_URL on Render to
// the deployed https://<service>.onrender.com/map.html (or a custom domain).
const TRACKER_URL = process.env.TRACKER_URL || 'http://localhost:3001/map.html';
// Same pre-colored (brand pink) logo PNG used in the Contact Us email,
// hosted on the main site's R2 bucket — rara.png itself is a CSS mask
// shape that only recolors via currentColor on the website, not in email.
const LOGO_URL = 'https://pub-4a50931df60f4c439b6752caaf2c2fc5.r2.dev/rara-pink-email.png';

async function sendRunStartedBroadcast() {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const from = process.env.RESEND_FROM || 'Nepal in 10 <updates@nepalin10.com>';

  if (!apiKey || !audienceId) {
    throw new Error(
      'RESEND_API_KEY and RESEND_AUDIENCE_ID must both be set to send the run-started email.',
    );
  }

  const resend = new Resend(apiKey);

  const created = await resend.broadcasts.create({
    audienceId,
    from,
    subject: "Rahul just started his 1,027km run across Nepal",
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d0f0e" style="background:#0d0f0e;">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <img src="${LOGO_URL}" width="72" height="72" alt="Nepal in 10" style="display:block;width:72px;height:72px;" />
                </td>
              </tr>
              <tr>
                <td align="center" style="font-family:Arial,Helvetica,sans-serif;padding:0 24px;">
                  <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#ff0052;">Nepal in 10</p>
                  <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#f2f3ef;">He's on the road.</h1>
                  <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#f2f3ef;">Rahul just started the attempt, 1,027km across Nepal, on foot, in 10 days. Follow his position live, right now.</p>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0 8px;">
                        <a href="${TRACKER_URL}" style="display:inline-block;background:#ff0052;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:14px 28px;border-radius:999px;">Watch the live track</a>
                      </td>
                      <td style="padding:0 8px;">
                        <a href="${SITE_URL}" style="display:inline-block;background:transparent;border:1px solid rgba(242,243,239,.35);color:#f2f3ef;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:13px 27px;border-radius:999px;">Visit the website</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:32px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(242,243,239,.45);">
                    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:rgba(242,243,239,.45);text-decoration:underline;">Unsubscribe from future run updates</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });

  if (created.error) {
    throw new Error(`Resend broadcast create failed: ${created.error.message}`);
  }

  const sent = await resend.broadcasts.send(created.data.id);
  if (sent.error) {
    throw new Error(`Resend broadcast send failed: ${sent.error.message}`);
  }
}

module.exports = { sendRunStartedBroadcast };
