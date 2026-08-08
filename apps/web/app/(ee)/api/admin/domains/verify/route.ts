import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { verifyDomain } from "@/lib/api/domains/verify-domain";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { SHORT_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const POST = withAdmin(async ({ req }) => {
  const { slug } = (await req.json()) as { slug?: string };

  if (!slug) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  if (slug.toLowerCase() === SHORT_DOMAIN) {
    return NextResponse.json(
      { error: `${SHORT_DOMAIN} is the built in domain and is always verified` },
      { status: 403 },
    );
  }

  const domain = await prisma.domain.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { slug: true },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  let response: Awaited<ReturnType<typeof getDomainResponse>>;

  try {
    response = await getDomainResponse(domain.slug);
  } catch (e) {
    console.error("[admin/domains] Vercel unreachable", e);
    return NextResponse.json(
      { error: "Could not reach Vercel. Status left unchanged." },
      { status: 502 },
    );
  }

  if (response.error) {
    if (response.error.code === "not_found") {
      return NextResponse.json(
        { error: "Domain is not attached to the Vercel project" },
        { status: 404 },
      );
    }

    console.error("[admin/domains] Vercel rejected the status request", {
      slug: domain.slug,
      code: response.error.code,
    });

    return NextResponse.json(
      {
        error: `Could not determine status (${response.error.code}). Status left unchanged.`,
      },
      { status: 502 },
    );
  }

  let verified = Boolean(response.verified);

  if (!verified) {
    const attempt = await verifyDomain(domain.slug);

    if (attempt?.error) {
      return NextResponse.json(
        { error: "Could not determine status. Status left unchanged." },
        { status: 502 },
      );
    }

    verified = Boolean(attempt?.verified);
  }

  await prisma.domain.update({
    where: { slug: domain.slug },
    data: { verified, lastChecked: new Date() },
  });

  return NextResponse.json({
    slug: domain.slug,
    verified,
    verification: response.verification ?? [],
  });
});
