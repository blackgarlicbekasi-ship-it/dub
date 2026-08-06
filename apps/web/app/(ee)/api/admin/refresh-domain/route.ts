import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export const POST = withAdmin(async ({ req }) => {
  const { domain } = await req.json();

  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  if (
    !process.env.PROJECT_ID_VERCEL ||
    !process.env.TEAM_ID_VERCEL ||
    !process.env.AUTH_BEARER_TOKEN
  ) {
    return NextResponse.json(
      {
        error:
          "Vercel API is not configured. PROJECT_ID_VERCEL, TEAM_ID_VERCEL and AUTH_BEARER_TOKEN are all required.",
      },
      { status: 501 },
    );
  }

  const removeResponse = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      method: "DELETE",
    },
  );

  const removed = await removeResponse.json().catch(() => ({}));

  if (!removeResponse.ok && removed?.error?.code !== "not_found") {
    return NextResponse.json(
      {
        error: `Failed to remove ${domain} from Vercel: ${removed?.error?.message ?? removeResponse.status}. The domain was not changed.`,
      },
      { status: 502 },
    );
  }

  const added = await addDomainToVercel(domain);

  if (added?.error && added.error.code !== "domain_already_in_use") {
    return NextResponse.json(
      {
        error: `${domain} was removed from Vercel but could not be re-added: ${added.error.message}. The domain is currently not serving traffic and must be re-added manually.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, domain });
});
