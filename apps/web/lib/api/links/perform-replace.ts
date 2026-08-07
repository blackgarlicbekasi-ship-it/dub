import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { linkCache } from "./cache";

export const MAX_REPLACE_LINKS = 500;

const BATCH_SIZE = 10;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type MatchMode = "exact" | "contains";

export interface ReplaceScope {
  workspaceIds?: string[];
  ownerUserId?: string;
  allWorkspaces?: boolean;
}

export interface ReplaceInput {
  oldValue: string;
  newValue: string;
  matchMode: MatchMode;
  scope: ReplaceScope;
}

const LINK_SELECT = {
  id: true,
  domain: true,
  key: true,
  shortLink: true,
  url: true,
  trackConversion: true,
  password: true,
  proxy: true,
  rewrite: true,
  expiresAt: true,
  expiredUrl: true,
  disabledAt: true,
  ios: true,
  android: true,
  geo: true,
  doIndex: true,
  projectId: true,
  programId: true,
  partnerId: true,
  testVariants: true,
  testCompletedAt: true,
  webhooks: { select: { webhookId: true } },
} satisfies Prisma.LinkSelect;

export type ReplaceCandidate = Prisma.LinkGetPayload<{
  select: typeof LINK_SELECT;
}>;

export const buildReplaceWhere = ({
  oldValue,
  matchMode,
  scope,
}: Pick<ReplaceInput, "oldValue" | "matchMode" | "scope">):
  | Prisma.LinkWhereInput
  | null => {
  const where: Prisma.LinkWhereInput = {
    url: matchMode === "exact" ? oldValue : { contains: oldValue },
  };

  if (scope.ownerUserId) {
    where.userId = scope.ownerUserId;
  }

  if (!scope.allWorkspaces) {
    if (!scope.workspaceIds || scope.workspaceIds.length === 0) {
      return null;
    }
    where.projectId = { in: scope.workspaceIds };
  }

  return where;
};

export const computeNewUrl = ({
  url,
  oldValue,
  newValue,
  matchMode,
}: {
  url: string;
  oldValue: string;
  newValue: string;
  matchMode: MatchMode;
}) =>
  matchMode === "exact"
    ? newValue
    : url.replace(new RegExp(escapeRegex(oldValue), "g"), newValue);

export const findReplaceCandidates = async (
  input: Pick<ReplaceInput, "oldValue" | "matchMode" | "scope">,
): Promise<ReplaceCandidate[]> => {
  const where = buildReplaceWhere(input);

  if (!where) {
    return [];
  }

  return prisma.link.findMany({
    where,
    select: LINK_SELECT,
    take: MAX_REPLACE_LINKS,
  });
};

export interface ReplaceResult {
  updated: number;
  failed: number;
  cacheFailed: number;
}

export const performReplace = async (
  input: ReplaceInput,
): Promise<ReplaceResult> => {
  const candidates = await findReplaceCandidates(input);

  const pending = candidates
    .map((link) => ({
      link,
      newUrl: computeNewUrl({
        url: link.url,
        oldValue: input.oldValue,
        newValue: input.newValue,
        matchMode: input.matchMode,
      }),
    }))
    .filter(({ link, newUrl }) => newUrl !== link.url);

  const persisted: ReplaceCandidate[] = [];
  let failed = 0;

  for (const batch of chunk(pending, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map(async ({ link, newUrl }) => {
        await prisma.link.update({
          where: { id: link.id },
          data: { url: newUrl },
        });
        return { ...link, url: newUrl };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        persisted.push(result.value);
      } else {
        failed++;
      }
    }
  }

  let cacheFailed = 0;

  for (const batch of chunk(persisted, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map((link) =>
        link.programId && link.partnerId
          ? linkCache.delete({ domain: link.domain, key: link.key })
          : linkCache.set(link as any),
      ),
    );

    cacheFailed += results.filter((r) => r.status === "rejected").length;
  }

  return { updated: persisted.length, failed, cacheFailed };
};
