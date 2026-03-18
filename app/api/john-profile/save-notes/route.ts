import { NextResponse } from "next/server";
import { saveStoredJohnProfileText } from "@/lib/profile-store";

type JohnProfile = {
  identity?: { name?: string; headline?: string; location?: string };
  summary?: string;
  skills?: string[];
  notes?: string[];
  preferences?: {
    preferred_roles?: string[];
    work_style?: string[];
    deal_breakers?: string[];
    remote_preference?: string;
    salary_range?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      johnProfileText?: string;
      johnSupplementalContext?: string;
    };

    if (!body.johnProfileText) {
      return NextResponse.json({ error: "johnProfileText is required." }, { status: 400 });
    }

    const parsedProfile = JSON.parse(body.johnProfileText) as JohnProfile;
    const notes = (body.johnSupplementalContext || "")
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const updatedProfile: JohnProfile = {
      ...parsedProfile,
      ...(notes.length ? { notes } : {})
    };

    if (!notes.length && "notes" in updatedProfile) {
      delete updatedProfile.notes;
    }

    const nextJson = JSON.stringify(updatedProfile, null, 2) + "\n";
    await saveStoredJohnProfileText(nextJson);

    return NextResponse.json({
      saved: true,
      johnProfileText: nextJson
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
