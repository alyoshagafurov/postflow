import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getProvider } from "@/providers/core/registry";
import { completeConnect } from "@/providers/service";
import { platformForProviderId } from "@/providers/adapters/platform-map";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

/** OAuth redirect handler — exchanges the code and persists the account. */
export async function GET(
  req: Request,
  { params }: { params: { platform: string } },
) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const providerId = params.platform;
  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.redirect(new URL("/accounts?error=not_configured", appUrl));
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("error")) {
    return NextResponse.redirect(new URL("/accounts?error=denied", appUrl));
  }
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/accounts?error=invalid_state", appUrl));
  }

  const pkceVerifier = cookies().get(`pf_pkce_${providerId}`)?.value;

  try {
    const redirectUri = `${appUrl}/api/connect/${providerId}/callback`;
    const { platformAccountId } = await completeConnect(providerId, {
      code,
      state,
      redirectUri,
      expectedUserId: session.user.id,
      pkceVerifier,
    });
    await writeAudit({
      userId: session.user.id,
      action: "social_account.connect",
      platform: platformForProviderId(providerId) ?? undefined,
      targetType: "SocialAccount",
      targetId: platformAccountId,
    });
    const res = NextResponse.redirect(
      new URL(`/accounts?connected=${providerId}`, appUrl),
    );
    res.cookies.delete(`pf_pkce_${providerId}`);
    return res;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[connect] callback failed", e);
    const reason = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      new URL(
        `/accounts?error=connect_failed&reason=${encodeURIComponent(reason.slice(0, 180))}`,
        appUrl,
      ),
    );
  }
}
