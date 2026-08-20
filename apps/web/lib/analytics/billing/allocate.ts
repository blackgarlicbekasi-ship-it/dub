export interface AllocationInput {
  domain: string;
  key: string;
  linkId: string;
  clicks: number;
}

export interface AllocatedRow extends AllocationInput {
  share: number;
  vercelAmount: number;
  redisAmount: number;
  totalAmount: number;
}

export interface AllocationSummary {
  totalClicks: number;
  rowCount: number;
  vercelTotal: number;
  redisTotal: number;
  grandTotal: number;
  decimals: number;
}

export interface AllocationResult {
  rows: AllocatedRow[];
  summary: AllocationSummary;
}

export interface AllocateArgs {
  rows: AllocationInput[];
  vercelTotal: number;
  redisTotal: number;
  decimals?: number;
}

const toUnits = (amount: number, decimals: number): number =>
  Math.round(amount * Math.pow(10, decimals));

const fromUnits = (units: number, decimals: number): number =>
  units / Math.pow(10, decimals);

const allocatePotUnits = ({
  potUnits,
  rows,
  totalClicks,
}: {
  potUnits: number;
  rows: AllocationInput[];
  totalClicks: number;
}): number[] => {
  if (rows.length === 0) {
    return [];
  }

  if (totalClicks <= 0 || potUnits === 0) {
    return rows.map(() => 0);
  }

  const floors: number[] = new Array(rows.length);
  const remainders: number[] = new Array(rows.length);
  let assigned = 0;

  for (let i = 0; i < rows.length; i++) {
    const numerator = potUnits * rows[i].clicks;
    const floor = Math.floor(numerator / totalClicks);

    floors[i] = floor;
    remainders[i] = numerator - floor * totalClicks;
    assigned += floor;
  }

  let leftover = potUnits - assigned;

  if (leftover > 0) {
    const order = rows.map((_, i) => i).sort((a, b) => {
      if (remainders[b] !== remainders[a]) {
        return remainders[b] - remainders[a];
      }

      if (rows[b].clicks !== rows[a].clicks) {
        return rows[b].clicks - rows[a].clicks;
      }

      return rows[a].linkId < rows[b].linkId ? -1 : 1;
    });

    for (let i = 0; i < leftover; i++) {
      floors[order[i % order.length]] += 1;
    }
  }

  return floors;
};

export const allocateByClickShare = ({
  rows,
  vercelTotal,
  redisTotal,
  decimals = 2,
}: AllocateArgs): AllocationResult => {
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);

  const vercelUnits = toUnits(vercelTotal, decimals);
  const redisUnits = toUnits(redisTotal, decimals);

  const vercelAllocated = allocatePotUnits({
    potUnits: vercelUnits,
    rows,
    totalClicks,
  });

  const redisAllocated = allocatePotUnits({
    potUnits: redisUnits,
    rows,
    totalClicks,
  });

  const allocated: AllocatedRow[] = rows.map((row, i) => {
    const vercelAmount = fromUnits(vercelAllocated[i], decimals);
    const redisAmount = fromUnits(redisAllocated[i], decimals);

    return {
      ...row,
      share: totalClicks > 0 ? row.clicks / totalClicks : 0,
      vercelAmount,
      redisAmount,
      totalAmount: fromUnits(
        vercelAllocated[i] + redisAllocated[i],
        decimals,
      ),
    };
  });

  const vercelSum = vercelAllocated.reduce((a, b) => a + b, 0);
  const redisSum = redisAllocated.reduce((a, b) => a + b, 0);

  if (rows.length > 0 && totalClicks > 0) {
    if (vercelSum !== vercelUnits) {
      throw new Error(
        `Vercel allocation mismatch: ${vercelSum} units allocated, ${vercelUnits} expected`,
      );
    }

    if (redisSum !== redisUnits) {
      throw new Error(
        `Redis allocation mismatch: ${redisSum} units allocated, ${redisUnits} expected`,
      );
    }
  }

  return {
    rows: allocated,
    summary: {
      totalClicks,
      rowCount: rows.length,
      vercelTotal: fromUnits(vercelSum, decimals),
      redisTotal: fromUnits(redisSum, decimals),
      grandTotal: fromUnits(vercelSum + redisSum, decimals),
      decimals,
    },
  };
};
