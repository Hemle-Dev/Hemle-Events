/** Wrap the original stream without mutating potentially immutable fetch headers. */
export function withResponseHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  if (
    pathname === "/auth" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    response.status >= 400
  ) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "private, no-store");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
