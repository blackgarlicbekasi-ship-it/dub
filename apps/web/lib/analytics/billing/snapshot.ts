import { prisma } from "@dub/prisma";

export type OwnerTier = 1 | 2 | 3;

export interface SnapshotRow {
  linkId: string;
  domain: string;
  key: string;
  clicks: number;
  userId: string | null;
  tier: OwnerTier;
  deleted: boolean;
}

export interface ClickSnapshot {
  rows: SnapshotRow[];
  totalClicks: number;
}

export class TinybirdUnavailableError extends Error {
  constructor(detail: string) {
    super("Analytics temporarily unavailable");
    this.name = "TinybirdUnavailableError";
    this.detail = detail;
  }

  detail: string;
}

const SQL_TIMEOUT_MS = 20000;

export const formatClickhouseDate = (date: Date): string =>
  date.toISOString().replace("T", " ").replace("Z", "").slice(0, 19);

export const formatPeriode = (start: Date, end: Date): string => {
  const fmt = (d: Date) =>
    d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
      .toUpperCase()
      .replace(/,/g, "");

  return `${fmt(start)} - ${fmt(end)}`;
};

const tbSql = async <T>(sql: string): Promise<T[]> => {
  const url = process.env.TINYBIRD_API_URL;
  const token = process.env.TINYBIRD_API_KEY;

  if (!url || !token) {
    throw new TinybirdUnavailableError("Tinybird credentials are not set");
  }

  let res: Response;

  try {
    res = await fetch(
      `${url}/v0/sql?q=${encodeURIComponent(`${sql} FORMAT JSON`)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(SQL_TIMEOUT_MS),
      },
    );
  } catch (e) {
    throw new TinybirdUnavailableError(
      e instanceof Error ? e.message : "network error",
    );
  }

  const body = await res.text();

  if (!res.ok) {
    throw new TinybirdUnavailableError(`${res.status} ${body.slice(0, 200)}`);
  }

  let parsed: { data?: T[]; error?: string };

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new TinybirdUnavailableError("response was not valid JSON");
  }

  if (parsed.error) {
    throw new TinybirdUnavailableError(parsed.error);
  }

  return parsed.data ?? [];
};

const quoteList = (values: string[]) =>
  values.map((v) => `'${v.replace(/[^A-Za-z0-9_-]/g, "")}'`).join(",");

const fetchMetadataWorkspaces = async (linkIds: string[]) => {
  if (linkIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await tbSql<{ link_id: string; workspace_id: string }>(
    `SELECT link_id, argMax(workspace_id, created_at) AS workspace_id
     FROM dub_links_metadata
     WHERE link_id IN (${quoteList(linkIds)})
     GROUP BY link_id`,
  );

  return new Map(
    rows
      .filter((r) => r.workspace_id)
      .map((r) => [r.link_id, r.workspace_id] as const),
  );
};

const resolveOwners = async (linkIds: string[]) => {
  const owners = new Map<string, { userId: string | null; tier: OwnerTier }>();

  const liveLinks = await prisma.link.findMany({
    where: { id: { in: linkIds } },
    select: { id: true, userId: true },
  });

  const liveById = new Map(liveLinks.map((l) => [l.id, l.userId]));
  const missing = linkIds.filter((id) => !liveById.has(id));
  const workspaceByLink = await fetchMetadataWorkspaces(missing);
  const workspaceIds = [...new Set(workspaceByLink.values())];

  const memberships = workspaceIds.length
    ? await prisma.projectUsers.findMany({
        where: { projectId: { in: workspaceIds } },
        select: { projectId: true, userId: true, role: true },
      })
    : [];

  const userByWorkspace = new Map<string, string>();

  for (const m of memberships) {
    if (!userByWorkspace.has(m.projectId) || m.role === "owner") {
      userByWorkspace.set(m.projectId, m.userId);
    }
  }

  for (const linkId of linkIds) {
    if (liveById.has(linkId)) {
      owners.set(linkId, { userId: liveById.get(linkId) ?? null, tier: 1 });
      continue;
    }

    const workspaceId = workspaceByLink.get(linkId);
    const userId = workspaceId ? userByWorkspace.get(workspaceId) : undefined;

    owners.set(
      linkId,
      userId ? { userId, tier: 2 } : { userId: null, tier: 3 },
    );
  }

  return owners;
};

export const fetchClickSnapshot = async ({
  start,
  end,
}: {
  start: Date;
  end: Date;
}): Promise<ClickSnapshot> => {
  const clickRows = await tbSql<{
    domain: string;
    key: string;
    link_id: string;
    clicks: number;
  }>(
    `SELECT domain, \`key\`, link_id, count() AS clicks
     FROM dub_click_events
     WHERE timestamp >= '${formatClickhouseDate(start)}'
       AND timestamp < '${formatClickhouseDate(end)}'
     GROUP BY domain, \`key\`, link_id
     ORDER BY clicks DESC`,
  );

  const nonZero = clickRows.filter((r) => Number(r.clicks) > 0);

  if (nonZero.some((r) => Number(r.clicks) <= 0)) {
    throw new Error("zero click rows survived filtering");
  }

  const linkIds = [...new Set(nonZero.map((r) => r.link_id))];
  const owners = await resolveOwners(linkIds);

  const rows: SnapshotRow[] = nonZero.map((r) => {
    const owner = owners.get(r.link_id)!;

    return {
      linkId: r.link_id,
      domain: r.domain,
      key: r.key,
      clicks: Number(r.clicks),
      userId: owner.userId,
      tier: owner.tier,
      deleted: owner.tier !== 1,
    };
  });

  return {
    rows,
    totalClicks: rows.reduce((sum, r) => sum + r.clicks, 0),
  };
};
