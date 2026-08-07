import { recordBannedOrigin } from "@/lib/api/links/banned-origin";
import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { LEGAL_WORKSPACE_ID, getDomainWithoutWWW } from "@dub/utils";
import { NextResponse } from "next/server";

export const DELETE = withAdmin(async ({ searchParams }) => {
  const { domain, key } = domainKeySchema.parse(searchParams);

  const link = await prisma.link.findUnique({
    where: { domain_key: { domain, key } },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.projectId === LEGAL_WORKSPACE_ID) {
    return NextResponse.json(
      { error: "This link is already banned" },
      { status: 400 },
    );
  }

  await recordBannedOrigin([link]);

  await prisma.link.update({
    where: { id: link.id },
    data: { projectId: LEGAL_WORKSPACE_ID },
  });

  const urlDomain = getDomainWithoutWWW(link.url);

  await Promise.allSettled([
    linkCache.delete({ domain: link.domain, key: link.key }),
    urlDomain && updateConfig({ key: "domains", value: urlDomain }),
  ]);

  return NextResponse.json({ success: true, shortLink: link.shortLink });
});
