import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import { BillingReportSection } from "./billing-report-section";

export default function AdminAnalytics() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <div className="w-full">
        <Analytics adminPage />
        <div className="mx-auto w-full max-w-screen-xl px-3 pb-16 lg:px-10">
          <BillingReportSection />
        </div>
      </div>
    </Suspense>
  );
}
