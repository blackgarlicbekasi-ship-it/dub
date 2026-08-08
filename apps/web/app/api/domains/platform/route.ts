import { getPlatformDomains } from "@/lib/api/domains/platform-domains";
import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

const genId = (prefix: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = prefix;
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

export const GET = async () => {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platformDomains = await getPlatformDomains();

  if (platformDomains.length === 0) {
    return NextResponse.json({ domains: [] });
  }

  let enabled = new Set<string>();

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT domain FROM UserDomain WHERE userId = ? AND enabled = 1`,
      session.user.id,
    )) as { domain: string }[];

    enabled = new Set(rows.map((r) => r.domain));
  } catch (e) {
    console.error("[domains/platform] preferences unreadable", e);
  }

  return NextResponse.json({
    domains: platformDomains.map((d) => ({
      slug: d.slug,
      description: d.placeholder,
      verified: d.verified,
      alwaysOn: d.platformDefault,
      enabled: d.platformDefault || enabled.has(d.slug),
    })),
  });
};

export const PATCH = async (req: NextRequest) => {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain, enabled } = await req.json();

  if (typeof domain !== "string" || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "domain and enabled are required" },
      { status: 400 },
    );
  }

  const platformDomains = await getPlatformDomains();
  const target = platformDomains.find((d) => d.slug === domain);

  if (!target) {
    return NextResponse.json(
      { error: "Domain is not available" },
      { status: 404 },
    );
  }

  if (target.platformDefault) {
    return NextResponse.json(
      { error: "This domain is always available and cannot be turned off" },
      { status: 400 },
    );
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO UserDomain (id, userId, domain, enabled) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      genId("udm_"),
      session.user.id,
      domain,
      enabled ? 1 : 0,
    );
  } catch (e) {
    console.error("[domains/platform] preference write failed", e);
    return NextResponse.json(
      { error: "Could not save preference" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, domain, enabled });
};
