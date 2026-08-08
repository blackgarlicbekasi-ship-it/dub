import { promises as dns } from "node:dns";

const LOOKUP_TIMEOUT_MS = 2500;

export const isDomainResolving = async (domain: string): Promise<boolean> => {
  try {
    const lookup = dns.lookup(domain);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("dns lookup timed out")),
        LOOKUP_TIMEOUT_MS,
      ),
    );

    const result = await Promise.race([lookup, timeout]);

    return Boolean(result?.address);
  } catch (e) {
    console.error("[domains] dns lookup failed", { domain, error: e });
    return false;
  }
};
