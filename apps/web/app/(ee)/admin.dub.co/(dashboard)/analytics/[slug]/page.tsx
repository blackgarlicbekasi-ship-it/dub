import { prisma } from "@dub/prisma";
import { SHORT_DOMAIN } from "@dub/utils";
import { notFound, redirect } from "next/navigation";

export default async function AdminLinkAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const link = await prisma.link.findFirst({
    where: {
      key: decodedSlug,
      domain: SHORT_DOMAIN,
    },
    select: {
      id: true,
    },
  });

  if (!link) {
    notFound();
  }

  redirect(`/analytics?linkId=${link.id}`);
}
