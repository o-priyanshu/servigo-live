import { AuthCard } from "@/components/auth/AuthCard"
import { AuthShell } from "@/components/auth/AuthShell"
import { Suspense } from "react";
import { buildAuthHref, sanitizeCallbackUrl } from "@/lib/auth/callback-url";

interface AuthSignupPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthSignupPage({ searchParams }: AuthSignupPageProps) {
  const sp = (await searchParams) ?? {};
  const roleRaw = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const callbackRaw = Array.isArray(sp.callbackUrl) ? sp.callbackUrl[0] : sp.callbackUrl;
  const roleIntent = roleRaw === "provider" ? "provider" : roleRaw === "admin" ? "admin" : "user";
  const callbackUrl = sanitizeCallbackUrl(
    typeof callbackRaw === "string" ? callbackRaw : ""
  );
  const footerHref = buildAuthHref("/auth/login", { roleIntent, callbackUrl });

  return (
    <AuthShell
      sideTitle="Connecting Trusted Service Providers with Homes"
      sideBody="Every provider is identity-verified and background-checked for your safety."
      authTitle="Create Your Account"
      authSubtitle="Join ServiGo’s Verified Network"
      footerText="Already have an account?"
      footerCta="Sign in"
      footerHref={footerHref}
    >
      <Suspense fallback={<div className="h-[450px] w-full animate-pulse rounded-xl border border-border bg-card/60" />}>
        <AuthCard initialMode="signup" roleIntent={roleIntent} callbackUrl={callbackUrl} />
      </Suspense>
    </AuthShell>
  )
}
