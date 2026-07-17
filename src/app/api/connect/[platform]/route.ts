import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProvider } from "@/providers/core/registry";
import { startConnect } from "@/providers/service";
import { env } from "@/lib/env";

/**
 * Begin an OAuth connect flow. `params.platform` is the provider id
 * (youtube/tiktok/instagram/…). The provider registry is the source of truth.
 */
export async function GET(
  _req: Request,
  { params }: { params: { platform: string } },
) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const providerId = params.platform;
  const provider = getProvider(providerId);
  if (!provider || !provider.isConfigured()) {
    return NextResponse.redirect(
      new URL(`/accounts?error=not_configured&platform=${providerId}`, appUrl),
    );
  }

  const redirectUri = `${appUrl}/api/connect/${providerId}/callback`;
  try {
    const { url, pkceVerifier } = startConnect(providerId, {
      userId: session.user.id,
      redirectUri,
    });
    const res = NextResponse.redirect(url);
    if (pkceVerifier) {
      // Stash the PKCE verifier for the callback (httpOnly, short-lived).
      res.cookies.set(`pf_pkce_${providerId}`, pkceVerifier, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    }
    return res;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      new URL(
        `/accounts?error=connect_failed&reason=${encodeURIComponent(reason.slice(0, 180))}`,
        appUrl,
      ),
    );
  }
}
