import { NextResponse } from "next/server";
import { Platform, SocialAccountStatus } from "@prisma/client";
import { getSession } from "@/lib/session";
import { getPublisher } from "@/lib/publishers";
import { verifyState } from "@/lib/oauth-state";
import { saveConnectedAccount } from "@/lib/social-accounts";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

const PLATFORM_MAP: Record<string, Platform> = {
  youtube: Platform.YOUTUBE,
  tiktok: Platform.TIKTOK,
  instagram: Platform.INSTAGRAM,
};

export async function GET(
  req: Request,
  { params }: { params: { platform: string } },
) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const platform = PLATFORM_MAP[params.platform];
  const publisher = platform ? getPublisher(platform) : null;
  if (!publisher) {
    return NextResponse.redirect(
      new URL("/accounts?error=not_configured", appUrl),
    );
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("error")) {
    return NextResponse.redirect(new URL("/accounts?error=denied", appUrl));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const data = state ? verifyState(state) : null;
  if (!code || !data || data.userId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/accounts?error=invalid_state", appUrl),
    );
  }

  try {
    const redirectUri = `${appUrl}/api/connect/${params.platform}/callback`;
    const connected = await publisher.connect(code, redirectUri);
    const status = publisher.requiresReview?.()
      ? SocialAccountStatus.PENDING_VERIFICATION
      : SocialAccountStatus.ACTIVE;
    await saveConnectedAccount(session.user.id, platform, connected, status);
    await writeAudit({
      userId: session.user.id,
      action: "social_account.connect",
      platform,
      targetType: "SocialAccount",
      targetId: connected.platformAccountId,
    });
    return NextResponse.redirect(
      new URL(`/accounts?connected=${params.platform}`, appUrl),
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[connect] callback failed", e);
    return NextResponse.redirect(
      new URL("/accounts?error=connect_failed", appUrl),
    );
  }
}
