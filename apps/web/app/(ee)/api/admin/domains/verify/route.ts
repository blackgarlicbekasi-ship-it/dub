import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { verifyDomain } from "@/lib/api/domains/verify-domain";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const POST = withAdmin(async ({ req }) => {
  const { slug } = (await req.json()) as { slug?: string };

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

  const response = await getDomainResponse(domain.slug);

  if (response.error && response.error.code === "not_found") {
    return NextResponse.json(
      { error: "Domain is not attached to the Vercel project" },
      { status: 404 },
    );
  }

  let verified = Boolean(response.verified);

  if (!verified) {
    const attempt = await verifyDomain(domain.slug);
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
