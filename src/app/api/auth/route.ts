import { NextRequest, NextResponse } from "next/server";

// Step 1 of Decap CMS's GitHub OAuth dance. Decap's "github" backend (used
// instead of Netlify Identity/Git Gateway because this site deploys to
// Vercel, not Netlify) redirects the admin UI here first, then expects to
// be sent on to GitHub's own authorize screen. /api/callback is step 2.
export async function GET(request: NextRequest) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("Missing OAUTH_GITHUB_CLIENT_ID environment variable", { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/callback`;
  const scope = request.nextUrl.searchParams.get("scope") || "repo,user";

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scope);

  return NextResponse.redirect(authorizeUrl);
}
