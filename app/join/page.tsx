import { redirect } from "next/navigation";

export default function JoinPage() {
  redirect("/auth/signup?role=provider&callbackUrl=/provider/register");
}
