import { NextRequest, NextResponse } from "next/server";

// Step 2 of Decap CMS's GitHub OAuth dance (see /api/auth). GitHub redirects
// here with a one-time `code`; this exchanges it for an access token, then
// hands that token back to the admin UI via the exact postMessage handshake
// Decap's github backend listens for: it posts "authorizing:github" to its
// opener first as a readiness ping, waits for any reply, then sends the
// real "authorization:github:success:<json>" message. Skipping that ping
// and sending the success message immediately is a common way this breaks —
// the CMS tab isn't always listening yet at the moment the popup loads.
function renderHandoffPage(message: string) {
  return `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(${JSON.stringify(message)}, e.origin);
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!code) {
    return new NextResponse("Missing OAuth code from GitHub", { status: 400 });
  }
  if (!clientId || !clientSecret) {
    return new NextResponse(
      "Missing OAUTH_GITHUB_CLIENT_ID / OAUTH_GITHUB_CLIENT_SECRET environment variables",
      { status: 500 },
    );
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenData: { access_token?: string; error?: string; error_description?: string } =
    await tokenResponse.json();

  if (!tokenData.access_token) {
    return new NextResponse(`GitHub OAuth error: ${tokenData.error_description ?? "unknown error"}`, {
      status: 400,
    });
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" });
  const html = renderHandoffPage(`authorization:github:success:${payload}`);

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
