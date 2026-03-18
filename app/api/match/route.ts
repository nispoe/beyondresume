import { NextResponse } from "next/server";
import { runMatch } from "@/lib/orchestrator";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      johnProfileText?: string;
      jobProfileText?: string;
      johnSupplementalContext?: string;
    };

    if (!body.johnProfileText || !body.jobProfileText) {
      return NextResponse.json(
        { error: "Both johnProfileText and jobProfileText are required." },
        { status: 400 }
      );
    }

    const result = await runMatch({
      johnProfileText: body.johnProfileText,
      jobProfileText: body.jobProfileText,
      johnSupplementalContext: body.johnSupplementalContext
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
