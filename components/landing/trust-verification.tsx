import {
  Fingerprint,
  ShieldCheck,
  ClipboardCheck,
  Star,
  Lock,
  ScanSearch,
} from "lucide-react";

const verificationPoints = [
  {
    icon: Fingerprint,
    title: "Identity Verification",
    description: "Government-issued ID verification before approval.",
  },
  {
    icon: ShieldCheck,
    title: "Background Checks",
    description: "Criminal and address verification where applicable.",
  },
  {
    icon: ClipboardCheck,
    title: "Skill Validation",
    description: "Experience and service-specific skill checks.",
  },
  {
    icon: Star,
    title: "Customer Ratings & Reviews",
    description: "Genuine feedback from real customers.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Payments handled safely through the platform.",
  },
  {
    icon: ScanSearch,
    title: "Ongoing Monitoring",
    description: "Continuous review of professional performance.",
  },
];

export function TrustVerification() {
  return (
    <section className="w-full bg-secondary/50 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-14 lg:mb-18">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
            Trust & Verification
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground lg:text-lg">
            Every professional on ServiGo is carefully verified for your safety.
          </p>
        </div>

        {/* Verification Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {verificationPoints.map((item) => (
            <div key={item.title} className="flex gap-4">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <item.icon
                  className="h-5 w-5 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </div>

              {/* Text */}
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
