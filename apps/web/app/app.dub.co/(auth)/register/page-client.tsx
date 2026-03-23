"use client";

import { Button } from "@dub/ui";
import Link from "next/link";

export default function RegisterPageClient() {
  return (
    <div className="w-full max-w-sm">
      <h3 className="text-center text-xl font-semibold">
        Registration is by invitation only
      </h3>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Contact your administrator to get an account.
      </p>
      <div className="mt-8">
        <Link href="/login">
          <Button text="Back to Login" variant="secondary" className="w-full" />
        </Link>
      </div>
    </div>
  );
}
