import { NextResponse } from "next/server";
import { initializeServices } from "@/lib/server/initialize-services";

export async function POST() {
  try {
    await initializeServices();
    return NextResponse.json({ message: "Services initialized successfully" });
  } catch (error: unknown) {
    console.error("Failed to initialize services:", error);
    return NextResponse.json({ error: "Failed to initialize services" }, { status: 500 });
  }
}