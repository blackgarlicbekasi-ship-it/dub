import { constructMetadata } from "@dub/utils";
import { BanLink } from "./components/ban-link";
import { CreateUser } from "./components/create-user";
import { DeletePartnerAccount } from "./components/delete-partner-account";
import { ImpersonateUser } from "./components/impersonate-user";
import { ImpersonateWorkspace } from "./components/impersonate-workspace";
import { RefreshDomain } from "./components/refresh-domain";
import { ResetLoginAttempts } from "./components/reset-login-attempts";

export const metadata = constructMetadata({
  title: "Ingat Admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-neutral-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Create User</h2>
        <p className="text-sm text-neutral-500">
          Create a new user account with a workspace and default domain
        </p>
        <CreateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate User</h2>
        <p className="text-sm text-neutral-500">Get a login link for a user</p>
        <ImpersonateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate Workspace</h2>
        <p className="text-sm text-neutral-500">
          Get a login link for the owner of a workspace
        </p>
        <ImpersonateWorkspace />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Ban Link</h2>
        <p className="text-sm text-neutral-500">Ban a short link</p>
        <BanLink />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Refresh Domain</h2>
        <p className="text-sm text-neutral-500">
          Remove and re-add domain from Vercel
        </p>
        <RefreshDomain />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Reset Login Attempts</h2>
        <p className="text-sm text-neutral-500">
          Reset a user&#39;s invalidLoginAttempts and lockedAt fields
        </p>
        <ResetLoginAttempts />
      </div>
    </div>
  );
}
