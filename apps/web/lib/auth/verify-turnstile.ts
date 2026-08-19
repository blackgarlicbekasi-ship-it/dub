const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const SITEVERIFY_TIMEOUT_MS = 5000;

export const verifyTurnstile = async (token?: string): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(
        `[turnstile] siteverify responded ${res.status}, allowing login`,
      );
      return true;
    }

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (data.success) {
      return true;
    }

    console.warn("[turnstile] token rejected", data["error-codes"]);
    return false;
  } catch (e) {
    console.error("[turnstile] siteverify unreachable, allowing login", e);
    return true;
  }
};
