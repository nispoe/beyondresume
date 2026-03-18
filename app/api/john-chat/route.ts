import { NextResponse } from "next/server";
import { runJohnChat } from "@/lib/orchestrator";
import { JohnChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      johnProfileText?: string;
      johnSupplementalContext?: string;
      messages?: JohnChatMessage[];
    };

    if (!body.johnProfileText) {
      return NextResponse.json({ error: "johnProfileText is required." }, { status: 400 });
    }

    if (!body.messages?.length) {
      return NextResponse.json({ error: "At least one chat message is required." }, { status: 400 });
    }

    const result = await runJohnChat({
      johnProfileText: body.johnProfileText,
      johnSupplementalContext: body.johnSupplementalContext,
      messages: body.messages
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
