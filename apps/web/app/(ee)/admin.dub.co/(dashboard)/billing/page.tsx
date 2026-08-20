import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import { BillingReportSection } from "./billing-report-section";

export default function AdminBilling() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <div className="mx-auto w-full max-w-screen-xl px-3 py-10 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Billing report
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Allocates the infrastructure bill across shortlinks by click share
            </p>
          </div>
          <SimpleDateRangePicker
            className="w-full sm:w-fit"
            align="end"
            defaultInterval="30d"
          />
        </div>
        <BillingReportSection />
      </div>
    </Suspense>
  );
}
