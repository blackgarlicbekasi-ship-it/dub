import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { removeDomainFromVercel } from "@/lib/api/domains/remove-domain-vercel";
import { setPlatformDefault } from "@/lib/api/domains/set-platform-default";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, SHORT_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const domains = await prisma.domain.findMany({
    select: {
      slug: true,
      verified: true,
      primary: true,
      archived: true,
      platformWide: true,
      platformDefault: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ domains });
});

export const POST = withAdmin(async ({ req }) => {
  const body = await req.json();
  const { slug, description } = body as {
    slug: string;
    description?: string;
  };

  if (!slug || typeof slug !== "string") {
    return NextResponse.json(
      { error: "Domain name is required" },
      { status: 400 },
    );
  }

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(slug)) {
    return NextResponse.json(
      { error: "Invalid domain format" },
      { status: 400 },
    );
  }

  // Check if domain already exists
  const existing = await prisma.domain.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Domain already exists" },
      { status: 409 },
    );
  }

  const vercelResponse = await addDomainToVercel(slug.toLowerCase());

  if (vercelResponse.error) {
    return NextResponse.json(
      { error: `Vercel rejected the domain: ${vercelResponse.error.message}` },
      { status: 422 },
    );
  }

  const status = await getDomainResponse(slug.toLowerCase());

  const domain = await prisma.domain.create({
    data: {
      slug: slug.toLowerCase(),
      verified: Boolean(status?.verified),
      primary: false,
      placeholder: description || null,
      projectId: DUB_WORKSPACE_ID,
    },
    select: {
      slug: true,
      verified: true,
      primary: true,
      archived: true,
      platformWide: true,
      platformDefault: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ domain }, { status: 201 });
});

export const PATCH = withAdmin(async ({ req }) => {
  const { slug, action, platformWide } = (await req.json()) as {
    slug?: string;
    action?: string;
    platformWide?: boolean;
  };

  if (!slug) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { slug: true },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (action === "set_primary") {
    if (domain.slug === SHORT_DOMAIN) {
      return NextResponse.json(
        {
          error: `${SHORT_DOMAIN} is the built in default and does not use the platform primary flag`,
        },
        { status: 403 },
      );
    }

    const updated = await setPlatformDefault(domain.slug);
    return NextResponse.json({
      success: true,
      message: `${domain.slug} is now the primary domain`,
      domain: updated,
    });
  }

  if (typeof platformWide === "boolean") {
    if (domain.slug === SHORT_DOMAIN && !platformWide) {
      return NextResponse.json(
        {
          error: `${SHORT_DOMAIN} is the built in domain and must stay available to everyone`,
        },
        { status: 403 },
      );
    }

    const updated = await prisma.domain.update({
      where: { slug: domain.slug },
      data: { platformWide },
      select: { slug: true, platformWide: true, platformDefault: true },
    });
    return NextResponse.json({ success: true, domain: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});

export const DELETE = withAdmin(async ({ req }) => {
  const { slug } = (await req.json()) as { slug?: string };

  if (!slug) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const target = slug.toLowerCase();

  if (target === SHORT_DOMAIN) {
    return NextResponse.json(
      { error: `${SHORT_DOMAIN} is the built in domain and cannot be deleted` },
      { status: 403 },
    );
  }

  const domain = await prisma.domain.findUnique({
    where: { slug: target },
    select: { slug: true, primary: true, platformDefault: true },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (domain.primary || domain.platformDefault) {
    return NextResponse.json(
      {
        error:
          "This domain is currently primary. Set a different domain as primary before deleting it.",
      },
      { status: 409 },
    );
  }

  const usage = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS links, COUNT(DISTINCT userId) AS users FROM Link WHERE domain = ?`,
    domain.slug,
  )) as { links: number | string; users: number | string }[];

  const linkCount = Number(usage[0]?.links ?? 0);
  const userCount = Number(usage[0]?.users ?? 0);

  if (linkCount > 0) {
    return NextResponse.json(
      {
        error: `This domain still has ${linkCount} ${linkCount === 1 ? "link" : "links"} across ${userCount} ${userCount === 1 ? "user" : "users"}. Ask those users to stop using it and remove their links first.`,
        linkCount,
        userCount,
      },
      { status: 409 },
    );
  }

  await removeDomainFromVercel(domain.slug);

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM UserDomain WHERE domain = ?`,
      domain.slug,
    );
  } catch (e) {
    console.error("[admin/domains] user preference cleanup failed", e);
  }

  await prisma.domain.delete({ where: { slug: domain.slug } });

  return NextResponse.json({
    success: true,
    message: `${domain.slug} deleted`,
  });
});
