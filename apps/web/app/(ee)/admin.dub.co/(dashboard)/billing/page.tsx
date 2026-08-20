import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import { BillingReportSection } from "./billing-report-section";

export default function AdminBilling() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <div className="mx-auto w-full max-w-screen-xl px-3 py-10 lg:px-10">
        <BillingReportSection />
      </div>
    </Suspense>
  );
}
