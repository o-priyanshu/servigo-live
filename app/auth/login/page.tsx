import { AuthCard } from "@/components/auth/AuthCard";
import { AuthShell } from "@/components/auth/AuthShell";
import { Suspense } from "react";
import { buildAuthHref, sanitizeCallbackUrl } from "@/lib/auth/callback-url";

interface AuthLoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthLoginPage({ searchParams }: AuthLoginPageProps) {
  const sp = (await searchParams) ?? {};
  const roleRaw = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const callbackRaw = Array.isArray(sp.callbackUrl) ? sp.callbackUrl[0] : sp.callbackUrl;
  const roleIntent = roleRaw === "provider" ? "provider" : "user";
  const callbackUrl = sanitizeCallbackUrl(
    typeof callbackRaw === "string" ? callbackRaw : ""
  );
  const footerHref = buildAuthHref("/auth/signup", { roleIntent, callbackUrl });

  return (
    <AuthShell
      sideTitle="Connecting Trusted Service Providers with Homes"
      sideBody="Secure. Verified. Reliable."
      authTitle="Welcome Back"
      authSubtitle="Verified Domestic Services"
      footerText="New to ServiGo?"
      footerCta="Sign up"
      footerHref={footerHref}
    >
      <div className="w-full max-w-md mx-auto">
        <Suspense fallback={<div className="h-[450px] w-full animate-pulse rounded-xl border border-border bg-card/60" />}>
          <AuthCard initialMode="signin" roleIntent={roleIntent} callbackUrl={callbackUrl} />
        </Suspense>
      </div>
    </AuthShell>
  );
}
