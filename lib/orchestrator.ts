import { MatchEvaluation, MatchResult, TranscriptMessage } from "@/lib/types";

type ParsedJohnProfile = {
  identity?: { name?: string };
  summary?: string;
  skills?: string[];
  preferences?: {
    preferred_roles?: string[];
    work_style?: string[];
    deal_breakers?: string[];
    remote_preference?: string;
    salary_range?: string;
  };
};

type ParsedJobProfile = {
  company?: {
    name?: string;
    summary?: string;
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

export async function runMatch(input: {
  johnProfileText: string;
  jobProfileText: string;
}): Promise<MatchResult> {
  const johnProfile = parseJson<ParsedJohnProfile>(input.johnProfileText, "John profile");
  const jobProfile = parseJson<ParsedJobProfile>(input.jobProfileText, "Job profile");

  if (process.env.OPENAI_API_KEY) {
    return runOpenAiMatch({ johnProfile, jobProfile });
  }

  return runMockMatch({ johnProfile, jobProfile });
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

async function runOpenAiMatch(input: {
  johnProfile: ParsedJohnProfile;
  jobProfile: ParsedJobProfile;
}): Promise<MatchResult> {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const prompt = buildPrompt(input.johnProfile, input.jobProfile);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const responseText = extractResponseText(payload);

  if (!responseText) {
    throw new Error("OpenAI response did not include parseable text output.");
  }

  const normalizedText = normalizeJsonText(responseText);
  const parsed = JSON.parse(normalizedText) as MatchResult;
  return {
    ...parsed,
    mode: "openai"
  };
}

function buildPrompt(johnProfile: ParsedJohnProfile, jobProfile: ParsedJobProfile) {
  return [
    "You are orchestrating a two-agent talent matching interview.",
    "Return only raw JSON.",
    "Do not use markdown.",
    "Do not wrap the response in triple backticks.",
    "The first character must be { and the last character must be }.",
    "The JSON must have this shape:",
    JSON.stringify(
      {
        mode: "openai",
        transcript: [{ role: "employer", content: "..." }],
        evaluation: {
          overallRecommendation: "possible_match",
          confidence: 0.8,
          summary: "...",
          strengths: ["..."],
          risks: ["..."],
          openQuestions: ["..."],
          scores: {
            skills: 0.8,
            experience: 0.7,
            culture: 0.7,
            motivation: 0.75,
            constraints: 0.85
          }
        }
      },
      null,
      2
    ),
    "Simulate a short but realistic 8-message transcript alternating between employer and john.",
    "John must not invent unsupported background details.",
    "The evaluation must be balanced and evidence-aware.",
    `John profile: ${JSON.stringify(johnProfile)}`,
    `Job profile: ${JSON.stringify(jobProfile)}`
  ].join("\n\n");
}

function extractResponseText(payload: {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const message = payload.output?.find((item) => item.type === "message");
  const textParts =
    message?.content
      ?.filter((part) => part.type === "output_text" && typeof part.text === "string")
      .map((part) => part.text?.trim())
      .filter(Boolean) || [];

  return textParts.join("\n").trim();
}

function normalizeJsonText(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
}

function runMockMatch(input: {
  johnProfile: ParsedJohnProfile;
  jobProfile: ParsedJobProfile;
}): MatchResult {
  const johnName = input.johnProfile.identity?.name || "John";
  const roleTitle = input.jobProfile.role?.title || "the role";
  const companyName = input.jobProfile.company?.name || "the company";
  const requiredSkills = normalizeList(input.jobProfile.role?.required_skills);
  const johnSkills = normalizeList(input.johnProfile.skills);
  const workStyle = normalizeList(input.johnProfile.preferences?.work_style);
  const cultureNotes = normalizeList(input.jobProfile.role?.culture_notes);

  const overlap = requiredSkills.filter((skill) => johnSkills.includes(skill));
  const transcript: TranscriptMessage[] = [
    {
      role: "employer",
      content: `Thanks for taking the time, ${johnName}. What draws you to ${roleTitle} at ${companyName}?`
    },
    {
      role: "john",
      content: `${companyName} looks interesting because the role sits at the intersection of execution, systems thinking, and cross-functional work. Based on my profile, those are the areas where I tend to add the most value.`
    },
    {
      role: "employer",
      content: `This role depends on ${requiredSkills.slice(0, 3).join(", ")}. Which of those feel strongest for you, and where would you still want to learn?`
    },
    {
      role: "john",
      content: overlap.length
        ? `The clearest alignment is with ${overlap.join(", ")}. I would want to be careful not to overclaim beyond the experience already reflected in my materials, so anything outside that set would need more discussion.`
        : "I would want to be careful not to overstate direct experience here. Some of the requirements look adjacent to my background, but I would want to validate the specifics together."
    },
    {
      role: "employer",
      content: "How do you prefer to work with teams when priorities are shifting and there is some ambiguity?"
    },
    {
      role: "john",
      content: workStyle.length
        ? `My preference is a ${workStyle.join(", ")} environment. In ambiguous situations I usually look for alignment on goals, then create enough structure to keep the work moving without slowing the team down.`
        : "I generally do best in collaborative environments where ambiguity can be turned into a practical plan with the team."
    },
    {
      role: "employer",
      content: `Our team describes itself as ${cultureNotes.join(", ")}. What would you want to clarify before deciding there is a real mutual fit?`
    },
    {
      role: "john",
      content: "I would want to understand how decisions get made, how success is measured in the first six months, and whether the day-to-day reality of the role matches the stated scope."
    }
  ];

  const scores = scoreProfiles(input.johnProfile, input.jobProfile, overlap);
  const evaluation = buildEvaluation(input.jobProfile, overlap, scores);

  return {
    mode: "mock",
    transcript,
    evaluation
  };
}

function scoreProfiles(
  johnProfile: ParsedJohnProfile,
  jobProfile: ParsedJobProfile,
  overlap: string[]
) {
  const requiredSkills = normalizeList(jobProfile.role?.required_skills);
  const cultureNotes = normalizeList(jobProfile.role?.culture_notes);
  const workStyle = normalizeList(johnProfile.preferences?.work_style);
  const constraintsScore = compareText(
    `${johnProfile.preferences?.remote_preference || ""} ${johnProfile.preferences?.salary_range || ""}`,
    `${jobProfile.role?.location_expectation || ""} ${jobProfile.role?.compensation_band || ""}`
  );

  const skills = requiredSkills.length ? overlap.length / requiredSkills.length : 0.5;
  const culture = cultureNotes.length ? Math.max(compareSets(cultureNotes, workStyle), 0.45) : 0.6;

  return {
    skills: roundScore(Math.max(skills, 0.25)),
    experience: roundScore(Math.min(0.55 + overlap.length * 0.1, 0.9)),
    culture: roundScore(culture),
    motivation: roundScore(0.7),
    constraints: roundScore(Math.max(constraintsScore, 0.5))
  };
}

function buildEvaluation(
  jobProfile: ParsedJobProfile,
  overlap: string[],
  scores: MatchEvaluation["scores"]
): MatchEvaluation {
  const average =
    (scores.skills + scores.experience + scores.culture + scores.motivation + scores.constraints) / 5;

  const overallRecommendation =
    average >= 0.8
      ? "strong_match"
      : average >= 0.65
        ? "possible_match"
        : average >= 0.45
          ? "weak_match"
          : "not_a_match";

  const roleTitle = jobProfile.role?.title || "the role";
  const strengths = [
    overlap.length
      ? `There is direct overlap between John's stated skills and the role requirements: ${overlap.join(", ")}.`
      : "John's materials suggest adjacent strengths, but direct requirement overlap is still limited.",
    "John's responses emphasize grounded communication rather than overselling experience.",
    "The conversation indicates interest in role clarity, decision-making, and practical execution."
  ];

  const risks = [
    "The current profile is still fairly high level, so evidence depth is limited.",
    "Culture fit remains partly inferred rather than directly proven.",
    overlap.length < 2
      ? "Some required skills need more validation through real examples."
      : "The strongest matching skills still need concrete project evidence during later interviews."
  ];

  const openQuestions = [
    `What outcomes would define success for ${roleTitle} in the first 90 to 180 days?`,
    "Which examples from John's background best demonstrate measurable impact?",
    "How closely do compensation, work arrangement, and day-to-day scope match John's expectations?"
  ];

  return {
    overallRecommendation,
    confidence: roundScore(Math.min(average + 0.08, 0.92)),
    summary:
      overallRecommendation === "strong_match"
        ? "The role looks like a strong early fit, with good alignment on core skills and workable constraints."
        : overallRecommendation === "possible_match"
          ? "The role looks promising, but it needs deeper validation on evidence and day-to-day scope."
          : overallRecommendation === "weak_match"
            ? "There are some points of alignment, but important gaps still need to be resolved."
            : "The current inputs suggest more mismatch than fit.",
    strengths,
    risks,
    openQuestions,
    scores
  };
}

function normalizeList(value: string[] | undefined) {
  return (value || []).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function compareSets(a: string[], b: string[]) {
  if (!a.length || !b.length) {
    return 0.5;
  }

  const matches = a.filter((item) => b.includes(item)).length;
  return matches / Math.max(a.length, b.length);
}

function compareText(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();

  if (!left || !right) {
    return 0.55;
  }

  const leftTokens = new Set(left.split(/[^a-z0-9$]+/).filter(Boolean));
  const rightTokens = new Set(right.split(/[^a-z0-9$]+/).filter(Boolean));
  const matches = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return matches / Math.max(leftTokens.size, rightTokens.size, 1);
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
