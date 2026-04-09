import type { ReactNode } from "react";
import ProviderLayout from "@/components/provider/ProviderLayout";

export default function ProviderPortalLayout({ children }: { children: ReactNode }) {
  return <ProviderLayout>{children}</ProviderLayout>;
}
