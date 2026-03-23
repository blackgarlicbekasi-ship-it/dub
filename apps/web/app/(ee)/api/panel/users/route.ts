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
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const users = await prisma.$queryRawUnsafe(`
    SELECT u.id, u.email,
      (SELECT COUNT(*) FROM Link l
       INNER JOIN ProjectUsers pu ON l.projectId = pu.projectId
       WHERE pu.userId = u.id AND pu.role = 'owner') as linkCount
    FROM User u
    WHERE u.email IS NOT NULL
    ORDER BY u.email ASC
    LIMIT 200
  `) as { id: string; email: string; linkCount: number }[];

  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, email: u.email, linkCount: Number(u.linkCount) })),
  });
};
