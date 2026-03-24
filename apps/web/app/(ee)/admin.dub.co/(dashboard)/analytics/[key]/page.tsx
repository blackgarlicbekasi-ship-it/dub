import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
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
      projectId: DUB_WORKSPACE_ID,
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
