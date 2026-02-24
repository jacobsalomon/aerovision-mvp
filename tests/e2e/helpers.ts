// Shared helpers for E2E tests.
// All URLs need the basePath prefix because Next.js serves under /aerovision-demo.
// All pages are behind a passcode gate that checks sessionStorage.
// All protected API routes check for a cookie.

import type { Page } from "@playwright/test";

export const BASE_PATH = "/aerovision-demo";

/** Prepend the basePath to a route path. e.g. url("/dashboard") → "/aerovision-demo/dashboard" */
export function url(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Headers that include the dashboard auth cookie for protected API routes */
export const authHeaders = {
  Cookie: "av-session=authenticated",
};

/** Bypass the passcode gate by setting sessionStorage before page loads */
export async function bypassPasscode(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("demo-unlocked", "true");
  });
}
