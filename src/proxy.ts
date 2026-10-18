import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cloudflare Access gate.
 *
 * Cloudflare Access sits in front of the custom domain and signs every request
 * it lets through with a JWT in the Cf-Access-Jwt-Assertion header. This proxy
 * verifies that JWT (signature, issuer, audience, expiry) so the app refuses
 * requests that bypass Cloudflare, such as hits on the *.up.railway.app URL.
 *
 * Enforced only when CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are both set, so
 * local dev and a deploy made before Access exists keep working.
 *
 * Public paths stay open on purpose:
 *  - /t.js and /api/track: the tracking pixel runs on your product sites,
 *    in visitors' browsers, which never have an Access session.
 *  - /api/cron/* and /api/admin/*: protected by CRON_SECRET instead, so a
 *    scheduler can call them without a Cloudflare service token.
 */
const PUBLIC = [/^\/t\.js$/, /^\/api\/track$/, /^\/api\/cron\//, /^\/api\/admin\//];

const team = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const aud = process.env.CF_ACCESS_AUD;
const jwks = team ? createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)) : null;

export async function proxy(req: NextRequest) {
  if (!team || !aud || !jwks) return NextResponse.next();
  if (PUBLIC.some((re) => re.test(req.nextUrl.pathname))) return NextResponse.next();

  const token = req.headers.get("cf-access-jwt-assertion") ?? req.cookies.get("CF_Authorization")?.value;
  if (!token) return deny("Sign in through Cloudflare Access to use this app.");
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud });
    return NextResponse.next();
  } catch {
    return deny("Your Cloudflare Access session is invalid or expired. Reload to sign in again.");
  }
}

function deny(message: string) {
  return new NextResponse(message, { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export const config = {
  // Everything except Next's static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
