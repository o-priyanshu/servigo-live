export type AuthRoleIntent = "user" | "provider";

const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

/**
 * Accept only in-app absolute paths as callback targets.
 * Reject protocol URLs and protocol-relative URLs.
 */
export function sanitizeCallbackUrl(value: string | null | undefined): string {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "";
  }
  if (SCHEME_PATTERN.test(trimmed)) {
    return "";
  }

  return trimmed;
}

export function buildAuthHref(
  basePath: "/auth/login" | "/auth/signup",
  options: {
    roleIntent?: AuthRoleIntent;
    callbackUrl?: string | null;
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.roleIntent === "provider") {
    params.set("role", options.roleIntent);
  }

  const callbackUrl = sanitizeCallbackUrl(options.callbackUrl);
  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
