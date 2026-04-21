import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { initializeServices } from "@/lib/server/initialize-services";

export async function POST() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await initializeServices();
    return NextResponse.json({ message: "Services initialized successfully" });
  } catch (error: unknown) {
    console.error("Failed to initialize services:", error);
    return NextResponse.json({ error: "Failed to initialize services" }, { status: 500 });
  }
}
