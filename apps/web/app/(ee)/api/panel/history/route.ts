import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

const CLEARABLE_DAYS = [7, 30, 90] as const;

const cutoffFor = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const GET = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isDubAdmin(session.user.id);

  try {
    if (admin) {
      const logs = await prisma.$queryRawUnsafe(
        `SELECT r.id, r.oldDomain, r.newDomain, r.linksUpdated, r.isUndo, r.createdAt, u.email as userEmail
         FROM ReplaceLog r LEFT JOIN User u ON CONVERT(r.userId USING utf8mb4) COLLATE utf8mb4_unicode_ci = u.id
         ORDER BY r.createdAt DESC LIMIT 200`,
      );

      const [counts] = await prisma.$queryRawUnsafe<
        { d7: bigint | null; d30: bigint | null; d90: bigint | null }[]
      >(
        `SELECT SUM(createdAt < ?) AS d7, SUM(createdAt < ?) AS d30, SUM(createdAt < ?) AS d90 FROM ReplaceLog`,
        cutoffFor(7),
        cutoffFor(30),
        cutoffFor(90),
      );

      return NextResponse.json({
        logs,
        clearCounts: {
          7: Number(counts?.d7 ?? 0),
          30: Number(counts?.d30 ?? 0),
          90: Number(counts?.d90 ?? 0),
        },
      });
    }

    const logs = await prisma.$queryRawUnsafe(
      `SELECT id, oldDomain, newDomain, linksUpdated, isUndo, createdAt FROM ReplaceLog WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
      session.user.id,
    );
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[panel/history] query failed", error);
    return NextResponse.json(
      { error: "Failed to load history", logs: [] },
      { status: 500 },
    );
  }
};

export const DELETE = async (req: Request) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isDubAdmin(session.user.id))) {
    return NextResponse.json(
      { error: "Only an administrator can clear the replace log" },
      { status: 403 },
    );
  }

  const { olderThanDays } = await req.json();

  if (!CLEARABLE_DAYS.includes(olderThanDays)) {
    return NextResponse.json(
      {
        error: `olderThanDays must be one of ${CLEARABLE_DAYS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await prisma.$executeRawUnsafe(
      "DELETE FROM ReplaceLog WHERE createdAt < ?",
      cutoffFor(olderThanDays),
    );

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("[panel/history] clear failed", error);
    return NextResponse.json(
      { error: "Failed to clear the replace log" },
      { status: 500 },
    );
  }
};
