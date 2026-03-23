import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

export const GET = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isDubAdmin(session.user.id);
  return NextResponse.json({ isAdmin: admin });
};
