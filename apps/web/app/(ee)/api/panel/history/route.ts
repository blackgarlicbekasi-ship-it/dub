import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.$queryRawUnsafe(
      `SELECT id, oldDomain, newDomain, linksUpdated, createdAt FROM ReplaceLog WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
      session.user.id,
    );

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ logs: [] });
  }
};
