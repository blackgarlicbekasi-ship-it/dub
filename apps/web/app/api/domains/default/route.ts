import { DubApiError } from @/lib/api/errors;
import { withWorkspace } from @/lib/auth;
import { getDefaultDomainsQuerySchema } from @/lib/zod/schemas/domains;
import { prisma } from @dub/prisma;
import { DUB_DOMAINS_ARRAY, SHORT_DOMAIN } from @dub/utils;
import { NextResponse } from next/server;
import * as z from zod/v4;

export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { search } = getDefaultDomainsQuerySchema.parse(searchParams);

    const data = await prisma.defaultDomains.findUnique({
      where: {
        projectId: workspace.id,
      },
      select: {
        dubsh: true,
      },
    });

    let defaultDomains: string[] = [];

    if (data) {
      if (data.dubsh) {
        defaultDomains.push(SHORT_DOMAIN);
      }
      if (search) {
        defaultDomains = defaultDomains.filter((d) =>
          d.toLowerCase().includes(search.toLowerCase()),
        );
      }
    }

    return NextResponse.json(defaultDomains);
  },
  {
    requiredPermissions: [domains.read],
  },
);

const updateDefaultDomainsSchema = z.object({
  defaultDomains: z.array(z.string()),
});

export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    if (DUB_DOMAINS_ARRAY.length === 0) {
      return NextResponse.json({});
    }

    const { defaultDomains } = await updateDefaultDomainsSchema.parseAsync(
      await req.json(),
    );

    const response = await prisma.defaultDomains.update({
      where: {
        projectId: workspace.id,
      },
      data: {
        dubsh: defaultDomains.includes(SHORT_DOMAIN),
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: [domains.write],
  },
);
