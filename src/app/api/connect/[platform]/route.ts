import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getSession } from "@/lib/session";
import { getPublisher } from "@/lib/publishers";
import { signState } from "@/lib/oauth-state";
import { env } from "@/lib/env";

const PLATFORM_MAP: Record<string, Platform> = {
  youtube: Platform.YOUTUBE,
  tiktok: Platform.TIKTOK,
  instagram: Platform.INSTAGRAM,
};

export async function GET(
  _req: Request,
  { params }: { params: { platform: string } },
) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const platform = PLATFORM_MAP[params.platform];
  const publisher = platform ? getPublisher(platform) : null;
  if (!publisher || !publisher.isConfigured()) {
    return NextResponse.redirect(
      new URL(
        `/accounts?error=not_configured&platform=${params.platform}`,
        appUrl,
      ),
    );
  }

  const redirectUri = `${appUrl}/api/connect/${params.platform}/callback`;
  const state = signState({
    userId: session.user.id,
    platform: params.platform,
  });
  return NextResponse.redirect(publisher.getAuthUrl(state, redirectUri));
}
