import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";

// Backs the Newsletter.tsx signup form. Adds the email to a Resend
// Audience — the same list live-run-tracker's run-started broadcast sends
// to — rather than a separate database, so there's one subscriber list,
// not two to keep in sync.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return NextResponse.json(
      { error: "Newsletter signups aren't configured yet." },
      { status: 503 },
    );
  }

  let resend;
  try {
    resend = getResend();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const result = await resend.contacts.create({ email, audienceId });
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
