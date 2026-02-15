// Helper to build API URLs that respect Next.js basePath.
// fetch() doesn't auto-prepend basePath like <Link> does,
// so we need this for all client-side API calls.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function apiUrl(path: string): string {
  return `${basePath}${path}`;
}
