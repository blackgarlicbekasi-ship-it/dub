import { prisma } from "@dub/prisma";
import { SHORT_DOMAIN } from "@dub/utils";
import { notFound } from "next/navigation";
import { AdminLinkAnalytics } from "./client";

export default async function AdminLinkAnalyticsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  // Look up link by key in the admin workspace
  const link = await prisma.link.findFirst({
    where: {
      key: decodedKey,
      domain: SHORT_DOMAIN,
    },
    select: {
      id: true,
      domain: true,
      key: true,
    },
  });

  if (!link) {
    notFound();
  }

  return <AdminLinkAnalytics linkId={link.id} linkKey={link.key} domain={link.domain} />;
}
