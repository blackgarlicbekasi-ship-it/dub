import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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
         FROM ReplaceLog r LEFT JOIN User u ON r.userId = u.id
         ORDER BY r.createdAt DESC LIMIT 200`,
      );
      return NextResponse.json({ logs });
    }

    const logs = await prisma.$queryRawUnsafe(
      `SELECT id, oldDomain, newDomain, linksUpdated, isUndo, createdAt FROM ReplaceLog WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
      session.user.id,
    );
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ logs: [] });
  }
};
