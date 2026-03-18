import { NextResponse } from "next/server";
import { getStoredJobProfileText, getStoredJohnProfileText } from "@/lib/profile-store";

export async function GET() {
  try {
    const [johnProfileText, jobProfileText] = await Promise.all([
      getStoredJohnProfileText(),
      getStoredJobProfileText()
    ]);

    return NextResponse.json({
      johnProfileText,
      jobProfileText
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
