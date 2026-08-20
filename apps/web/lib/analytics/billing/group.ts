export const UNATTRIBUTED_KEY = "__unattributed__";

export interface GroupableRow {
  userId: string | null;
  toko: string;
  clicks: number;
  vercelAmount: number | null;
  upstashAmount: number | null;
  totalAmount: number | null;
}

export interface OwnerSubtotal {
  clicks: number;
  share: number;
  vercelAmount: number | null;
  upstashAmount: number | null;
  totalAmount: number | null;
}

export interface OwnerGroup<T extends GroupableRow> {
  key: string;
  toko: string;
  userId: string | null;
  unattributed: boolean;
  rows: T[];
  subtotal: OwnerSubtotal;
}

const sumOrNull = (values: (number | null)[]): number | null => {
  if (values.every((v) => v === null)) {
    return null;
  }

  return values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
};

export const groupRowsByOwner = <T extends GroupableRow>(
  rows: T[],
  totalClicks: number,
): OwnerGroup<T>[] => {
  const buckets = new Map<string, T[]>();

  for (const row of rows) {
    const key = row.userId ?? UNATTRIBUTED_KEY;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const groups: OwnerGroup<T>[] = [];

  for (const [key, bucket] of buckets) {
    const ordered = [...bucket].sort((a, b) => b.clicks - a.clicks);
    const clicks = ordered.reduce((sum, r) => sum + r.clicks, 0);

    groups.push({
      key,
      toko: ordered[0].toko,
      userId: ordered[0].userId,
      unattributed: key === UNATTRIBUTED_KEY,
      rows: ordered,
      subtotal: {
        clicks,
        share: totalClicks > 0 ? clicks / totalClicks : 0,
        vercelAmount: sumOrNull(ordered.map((r) => r.vercelAmount)),
        upstashAmount: sumOrNull(ordered.map((r) => r.upstashAmount)),
        totalAmount: sumOrNull(ordered.map((r) => r.totalAmount)),
      },
    });
  }

  return groups.sort((a, b) => {
    if (b.subtotal.clicks !== a.subtotal.clicks) {
      return b.subtotal.clicks - a.subtotal.clicks;
    }

    return a.toko < b.toko ? -1 : 1;
  });
};
