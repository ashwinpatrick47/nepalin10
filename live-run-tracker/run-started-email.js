// Sends the "Rahul started his run" email to the Resend Audience built from
// the main site's newsletter signup form (src/app/api/subscribe on the main
// site). Uses Resend's Broadcasts API (create, then send) — one call
// reaches the whole list and respects each recipient's own unsubscribe
// status, rather than looping individual sends here.
const { Resend } = require('resend');

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

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
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0d0f0e;">
        <p style="font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#ff0052;margin:0 0 16px;">Nepal in 10</p>
        <h1 style="font-size:28px;line-height:1.15;margin:0 0 16px;">He's on the road.</h1>
        <p style="font-size:16px;line-height:1.6;margin:0 0 28px;">Rahul just started the attempt &mdash; 1,027km across Nepal, on foot, in 10 days. Follow his position live, right now.</p>
        <a href="${SITE_URL}" style="display:inline-block;background:#ff0052;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:14px 28px;border-radius:999px;">Watch the live track</a>
      </div>
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
