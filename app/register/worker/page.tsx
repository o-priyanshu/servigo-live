import { redirect } from "next/navigation";

export default function RegisterWorkerPage() {
  redirect("/auth/signup?role=provider&callbackUrl=/provider/register");
}
