import { getSearchParams } from "@dub/utils";
import { isAdminUserId } from "./admin-ids";
import { getSession } from "./utils";

// Internal use only (for admin portal)
interface WithAdminHandler {
  ({
    req,
    params,
    searchParams,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
  }): Promise<Response>;
}

export const isDubAdmin = async (userId: string) => {
  return isAdminUserId(userId);
};

export const withAdmin =
  (handler: WithAdminHandler) =>
  async (
    req: Request,
    { params: initialParams }: { params: Promise<Record<string, string>> },
  ) => {
    const params = (await initialParams) || {};
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized: Login required.", { status: 401 });
    }

    const isAdminUser = await isDubAdmin(session.user.id);
    if (!isAdminUser) {
      return new Response("Unauthorized: Not an admin.", { status: 401 });
    }

    const searchParams = getSearchParams(req.url);
    return handler({ req, params, searchParams });
  };
