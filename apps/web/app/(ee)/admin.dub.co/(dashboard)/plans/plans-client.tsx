"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PlanConfig {
  plan: string;
  linksLimit: number;
  usageLimit: number;
  domainsLimit: number;
  tagsLimit: number;
  foldersLimit: number;
  usersLimit: number;
  aiLimit: number;
  apiRateLimit: number;
  analyticsRetention: number;
  workspaceCount?: number;
}

const PLAN_ORDER = ["free", "pro", "business", "enterprise"];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-neutral-100 text-neutral-700",
  pro: "bg-blue-100 text-blue-700",
  business: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

const FIELD_LABELS: { key: keyof PlanConfig; label: string; suffix?: string }[] = [
  { key: "linksLimit", label: "Links Limit" },
  { key: "usageLimit", label: "Clicks/Month Limit" },
  { key: "domainsLimit", label: "Domains Limit" },
  { key: "tagsLimit", label: "Tags Limit" },
  { key: "foldersLimit", label: "Folders Limit" },
  { key: "usersLimit", label: "Users Limit" },
  { key: "aiLimit", label: "AI Credits Limit" },
  { key: "apiRateLimit", label: "API Rate Limit", suffix: "req/min" },
  { key: "analyticsRetention", label: "Analytics Retention", suffix: "days" },
];

function PlanCard({
  config,
  onSave,
}: {
  config: PlanConfig;
  onSave: (updated: PlanConfig) => Promise<void>;
}) {
  const [values, setValues] = useState<PlanConfig>(config);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValues(config);
    setDirty(false);
  }, [config]);

  const handleChange = (key: keyof PlanConfig, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setValues((prev) => ({ ...prev, [key]: num }));
    setDirty(true);
  };

  const handleSave = async () => {
    const affected = config.workspaceCount ?? 0;
    const confirmed = window.confirm(
      `Overwrite limits for every workspace on the ${PLAN_LABELS[config.plan]} plan?\n\n` +
        `${affected} workspace${affected === 1 ? "" : "s"} will be rewritten immediately. ` +
        `Any per-workspace custom limits on this plan will be lost. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      await onSave(values);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {PLAN_LABELS[config.plan]}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_COLORS[config.plan]}`}
          >
            {config.plan}
          </span>
          <span className="text-xs text-neutral-500">
            {config.workspaceCount ?? 0} workspace
            {config.workspaceCount === 1 ? "" : "s"}
          </span>
        </div>
        <Button
          text={saving ? "Saving..." : "Save"}
          loading={saving}
          disabled={!dirty}
          className="h-9 w-auto"
          onClick={handleSave}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {FIELD_LABELS.map(({ key, label, suffix }) => (
          <label key={key} className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">
              {label}
              {suffix && (
                <span className="ml-1 text-xs font-normal text-neutral-400">
                  ({suffix})
                </span>
              )}
            </span>
            <Input
              type="number"
              min={0}
              value={values[key] as number}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(key, e.target.value)
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function PlansClient() {
  const [plans, setPlans] = useState<PlanConfig[] | null>(null);

  const fetchPlans = useCallback(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.plans || []).sort(
          (a: PlanConfig, b: PlanConfig) =>
            PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan),
        );
        setPlans(sorted);
      })
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSave = async (updated: PlanConfig) => {
    const res = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(
        `${PLAN_LABELS[updated.plan]} plan updated. ${data.workspacesAffected} workspace${data.workspacesAffected !== 1 ? "s" : ""} affected.`,
      );
      fetchPlans();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update plan");
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Plan Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure limits for each plan. Changes apply immediately to all
          workspaces on that plan.
        </p>
      </div>
      {plans === null ? (
        <div className="flex h-60 items-center justify-center">
          <LoadingSpinner className="h-6 w-6" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-neutral-200 bg-white text-sm text-neutral-500">
          No plan configurations found
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.plan} config={plan} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
