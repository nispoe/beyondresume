import { NextResponse } from "next/server";
import { runCompanyChat } from "@/lib/orchestrator";
import { CompanyChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobProfileText?: string;
      messages?: CompanyChatMessage[];
    };

    if (!body.jobProfileText) {
      return NextResponse.json({ error: "jobProfileText is required." }, { status: 400 });
    }

    if (!body.messages?.length) {
      return NextResponse.json({ error: "At least one chat message is required." }, { status: 400 });
    }

    const result = await runCompanyChat({
      jobProfileText: body.jobProfileText,
      messages: body.messages
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
