import { ReactNode } from "react";
import { PanelNav } from "./panel-nav";

export default function PanelDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <PanelNav />
      {children}
    </div>
  );
}
