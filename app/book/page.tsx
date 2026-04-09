import { redirect } from "next/navigation";

export default function BookIndexPage() {
  redirect("/dashboard?tab=bookings");
}
