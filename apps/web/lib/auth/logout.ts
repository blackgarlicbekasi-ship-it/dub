/**
 * Custom logout function that clears session cookies with the correct domain.
 * Use this instead of next-auth's signOut() to ensure cookies on .ingat.cc are cleared.
 */
export async function doLogout(callbackUrl: string = "/login") {
  try {
    await fetch(`/api/auth/logout?callbackUrl=${encodeURIComponent(callbackUrl)}`, {
      method: "POST",
    });
  } catch {
    // Continue to redirect even if the API call fails
  }
  window.location.href = callbackUrl;
}
