import { redirect } from "next/navigation";

export default function AdminProviderDetailRedirectPage() {
  redirect("/admin/workers");
}
