import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { PlansClient } from "./plans-client";

export const metadata = constructMetadata({ title: "Plan Settings – Ingat Admin", noIndex: true });

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <PlansClient />
    </Suspense>
  );
}
