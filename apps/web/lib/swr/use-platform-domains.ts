import { fetcher } from "@dub/utils";
import useSWR from "swr";

export interface PlatformDomainOption {
  slug: string;
  description: string | null;
  verified: boolean;
  alwaysOn: boolean;
  enabled: boolean;
}

export default function usePlatformDomains() {
  const { data, error, mutate } = useSWR<{ domains: PlatformDomainOption[] }>(
    "/api/domains/platform",
    fetcher,
    { dedupingInterval: 60000 },
  );

  return {
    platformDomains: data?.domains ?? [],
    enabledPlatformDomains: (data?.domains ?? []).filter((d) => d.enabled),
    loading: !data && !error,
    mutate,
    error,
  };
}
