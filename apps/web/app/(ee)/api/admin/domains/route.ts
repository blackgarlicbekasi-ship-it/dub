import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const domains = await prisma.domain.findMany({
    select: {
      slug: true,
      verified: true,
      primary: true,
      archived: true,
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

  const domain = await prisma.domain.create({
    data: {
      slug: slug.toLowerCase(),
      verified: true,
      primary: false,
      placeholder: description || null,
      projectId: DUB_WORKSPACE_ID,
    },
    select: {
      slug: true,
      verified: true,
      primary: true,
      archived: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ domain }, { status: 201 });
});
