import { NextResponse } from "next/server";
import { saveStoredJobProfileText } from "@/lib/profile-store";

type JobProfile = {
  company?: {
    name?: string;
    industry?: string;
    size?: string;
    summary?: string;
    notes?: string[];
  };
  role?: {
    title?: string;
    required_skills?: string[];
    nice_to_have_skills?: string[];
    culture_notes?: string[];
    location_expectation?: string;
    compensation_band?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobProfileText?: string;
      companySupplementalContext?: string;
    };

    if (!body.jobProfileText) {
      return NextResponse.json({ error: "jobProfileText is required." }, { status: 400 });
    }

    const parsedProfile = JSON.parse(body.jobProfileText) as JobProfile;
    const notes = (body.companySupplementalContext || "")
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const updatedProfile: JobProfile = {
      ...parsedProfile,
      company: {
        ...(parsedProfile.company || {}),
        ...(notes.length ? { notes } : {})
      }
    };

    if (!notes.length && updatedProfile.company && "notes" in updatedProfile.company) {
      delete updatedProfile.company.notes;
    }

    const nextJson = JSON.stringify(updatedProfile, null, 2) + "\n";
    await saveStoredJobProfileText(nextJson);

    return NextResponse.json({
      saved: true,
      jobProfileText: nextJson
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
