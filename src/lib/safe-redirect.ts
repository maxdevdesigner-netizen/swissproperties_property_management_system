const BASE = "http://local.invalid";

/**
 * `value` if it's a path on this site, otherwise `fallback`. Checking for a leading "/" isn't
 * enough: browsers read "//host", "/\host" and "/\t/host" as links to another site.
 */
export function localPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
