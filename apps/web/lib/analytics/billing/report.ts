import { prisma } from "@dub/prisma";
import { allocateByClickShare } from "./allocate";
import type { OwnerTier, SnapshotRow } from "./snapshot";

export const VERCEL_SUMMARY_LINE = "HOSTING SHORTLINK INGAT.CC";

export const UNATTRIBUTED_LABEL = "(unattributed)";

export interface ResolvedRow {
  linkId: string;
  domain: string;
  key: string;
  shortLink: string;
  toko: string;
  userId: string | null;
  tier: OwnerTier;
  deleted: boolean;
  clicks: number;
  share: number;
  vercelAmount: number | null;
  upstashAmount: number | null;
  totalAmount: number | null;
}

export interface ResolvedSummary {
  totalClicks: number;
  rowCount: number;
  periode: string;
  vercelTotal: number | null;
  upstashTotal: number | null;
  grandTotal: number | null;
  vercelLine: string;
  snapshotAt: string;
}

export interface ResolvedReport {
  id: string;
  start: string;
  end: string;
  intervalToken: string | null;
  rows: ResolvedRow[];
  summary: ResolvedSummary;
}

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export const buildLabelMap = async (userIds: string[]) => {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];

  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const [users, aliases] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    }),
    prisma.billingAlias.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, alias: true },
    }),
  ]);

  const emailById = new Map(users.map((u) => [u.id, u.email] as const));
  const aliasById = new Map(aliases.map((a) => [a.userId, a.alias] as const));

  return new Map(
    ids.map((id) => {
      const alias = aliasById.get(id);

      if (alias) {
        return [id, alias] as const;
      }

      const email = emailById.get(id);

      return [id, email || id] as const;
    }),
  );
};

export const resolveRows = ({
  snapshot,
  vercelTotal,
  upstashTotal,
  labels,
  decimals = 2,
}: {
  snapshot: SnapshotRow[];
  vercelTotal: number | null;
  upstashTotal: number | null;
  labels: Map<string, string>;
  decimals?: number;
}): ResolvedRow[] => {
  const ordered = [...snapshot].sort((a, b) => {
    if (b.clicks !== a.clicks) {
      return b.clicks - a.clicks;
    }

    return a.linkId < b.linkId ? -1 : 1;
  });

  const { rows } = allocateByClickShare({
    rows: ordered.map((r) => ({
      domain: r.domain,
      key: r.key,
      linkId: r.linkId,
      clicks: r.clicks,
    })),
    vercelTotal: vercelTotal ?? 0,
    redisTotal: upstashTotal ?? 0,
    decimals,
  });

  return rows.map((allocated, i) => {
    const source = ordered[i];
    const vercelAmount = vercelTotal === null ? null : allocated.vercelAmount;
    const upstashAmount = upstashTotal === null ? null : allocated.redisAmount;

    const totalAmount =
      vercelAmount === null && upstashAmount === null
        ? null
        : (vercelAmount ?? 0) + (upstashAmount ?? 0);

    return {
      linkId: source.linkId,
      domain: source.domain,
      key: source.key,
      shortLink: `${source.domain}/${source.key}`,
      toko: source.userId
        ? labels.get(source.userId) ?? source.userId
        : UNATTRIBUTED_LABEL,
      userId: source.userId,
      tier: source.tier,
      deleted: source.deleted,
      clicks: source.clicks,
      share: allocated.share,
      vercelAmount,
      upstashAmount,
      totalAmount,
    };
  });
};

export const resolveReport = async (report: {
  id: string;
  start: Date;
  end: Date;
  intervalToken: string | null;
  periode: string;
  vercelTotal: unknown;
  upstashTotal: unknown;
  snapshot: unknown;
  totalClicks: number;
  snapshotAt: Date;
}): Promise<ResolvedReport> => {
  const snapshot = (report.snapshot as SnapshotRow[]) ?? [];
  const vercelTotal = toNumber(report.vercelTotal);
  const upstashTotal = toNumber(report.upstashTotal);

  const labels = await buildLabelMap(
    snapshot.map((r) => r.userId).filter((id): id is string => Boolean(id)),
  );

  const rows = resolveRows({ snapshot, vercelTotal, upstashTotal, labels });

  const grandTotal =
    vercelTotal === null && upstashTotal === null
      ? null
      : (vercelTotal ?? 0) + (upstashTotal ?? 0);

  return {
    id: report.id,
    start: report.start.toISOString(),
    end: report.end.toISOString(),
    intervalToken: report.intervalToken,
    rows,
    summary: {
      totalClicks: report.totalClicks,
      rowCount: rows.length,
      periode: report.periode,
      vercelTotal,
      upstashTotal,
      grandTotal,
      vercelLine: VERCEL_SUMMARY_LINE,
      snapshotAt: report.snapshotAt.toISOString(),
    },
  };
};
