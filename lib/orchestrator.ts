import {
  CompanyChatMessage,
  CompanyChatResult,
  JohnChatMessage,
  JohnChatResult,
  MatchEvaluation,
  MatchResult,
  TranscriptMessage
} from "@/lib/types";

type ParsedJohnProfile = {
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

type ParsedJobProfile = {
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

export async function runMatch(input: {
  johnProfileText: string;
  jobProfileText: string;
  johnSupplementalContext?: string;
  companySupplementalContext?: string;
}): Promise<MatchResult> {
  const johnProfile = enrichJohnProfile(
    parseJson<ParsedJohnProfile>(input.johnProfileText, "John profile"),
    input.johnSupplementalContext
  );
  const jobProfile = enrichJobProfile(
    parseJson<ParsedJobProfile>(input.jobProfileText, "Job profile"),
    input.companySupplementalContext
  );

  if (process.env.OPENAI_API_KEY) {
    return runOpenAiMatch({ johnProfile, jobProfile });
  }

  return runMockMatch({ johnProfile, jobProfile });
}

export async function runJohnChat(input: {
  johnProfileText: string;
  johnSupplementalContext?: string;
  messages: JohnChatMessage[];
}): Promise<JohnChatResult> {
  const johnProfile = enrichJohnProfile(
    parseJson<ParsedJohnProfile>(input.johnProfileText, "John profile"),
    input.johnSupplementalContext
  );
  const messages = input.messages.filter((message) => message.content.trim());

  if (!messages.length) {
    throw new Error("At least one chat message is required.");
  }

  if (process.env.OPENAI_API_KEY) {
    return runOpenAiJohnChat({ johnProfile, messages });
  }

  return runMockJohnChat({ johnProfile, messages });
}

export async function runCompanyChat(input: {
  jobProfileText: string;
  companySupplementalContext?: string;
  messages: CompanyChatMessage[];
}): Promise<CompanyChatResult> {
  const jobProfile = enrichJobProfile(
    parseJson<ParsedJobProfile>(input.jobProfileText, "Job profile"),
    input.companySupplementalContext
  );
  const messages = input.messages.filter((message) => message.content.trim());

  if (!messages.length) {
    throw new Error("At least one chat message is required.");
  }

  if (process.env.OPENAI_API_KEY) {
    return runOpenAiCompanyChat({ jobProfile, messages });
  }

  return runMockCompanyChat({ jobProfile, messages });
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function enrichJohnProfile(johnProfile: ParsedJohnProfile, supplementalContext?: string) {
  const normalizedNotes = [
    ...(johnProfile.notes || []),
    ...splitSupplementalContext(supplementalContext)
  ].filter(Boolean);

  if (!normalizedNotes.length) {
    return johnProfile;
  }

  return {
    ...johnProfile,
    notes: normalizedNotes
  };
}

function enrichJobProfile(jobProfile: ParsedJobProfile, supplementalContext?: string) {
  const normalizedNotes = [
    ...(jobProfile.company?.notes || []),
    ...splitSupplementalContext(supplementalContext)
  ].filter(Boolean);

  if (!normalizedNotes.length) {
    return jobProfile;
  }

  return {
    ...jobProfile,
    company: {
      ...(jobProfile.company || {}),
      notes: normalizedNotes
    }
  };
}

function splitSupplementalContext(value?: string) {
  return (value || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function runOpenAiMatch(input: {
  johnProfile: ParsedJohnProfile;
  jobProfile: ParsedJobProfile;
}): Promise<MatchResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const responseText = await requestOpenAi({
    model,
    prompt: buildMatchPrompt(input.johnProfile, input.jobProfile)
  });

  const normalizedText = normalizeJsonText(responseText);
  const parsed = JSON.parse(normalizedText) as MatchResult;
  return {
    ...parsed,
    mode: "openai"
  };
}

async function runOpenAiJohnChat(input: {
  johnProfile: ParsedJohnProfile;
  messages: JohnChatMessage[];
}): Promise<JohnChatResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const reply = await requestOpenAi({
    model,
    prompt: buildJohnChatPrompt(input.johnProfile, input.messages)
  });

  return {
    mode: "openai",
    reply: reply.trim()
  };
}

async function runOpenAiCompanyChat(input: {
  jobProfile: ParsedJobProfile;
  messages: CompanyChatMessage[];
}): Promise<CompanyChatResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const reply = await requestOpenAi({
    model,
    prompt: buildCompanyChatPrompt(input.jobProfile, input.messages)
  });

  return {
    mode: "openai",
    reply: reply.trim()
  };
}

async function requestOpenAi(input: { model: string; prompt: string }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt
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

  return responseText;
}

function buildMatchPrompt(johnProfile: ParsedJohnProfile, jobProfile: ParsedJobProfile) {
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

function buildJohnChatPrompt(johnProfile: ParsedJohnProfile, messages: JohnChatMessage[]) {
  const transcript = messages
    .map((message) => `${message.role === "john" ? "John" : "User"}: ${message.content}`)
    .join("\n");

  return [
    "You are answering as John based only on the provided profile.",
    "Be concise, conversational, and grounded.",
    "If the profile does not support a claim, say you do not have enough information rather than inventing details.",
    "Return plain text only.",
    `John profile: ${JSON.stringify(johnProfile)}`,
    `Conversation so far:\n${transcript}`
  ].join("\n\n");
}

function buildCompanyChatPrompt(jobProfile: ParsedJobProfile, messages: CompanyChatMessage[]) {
  const transcript = messages
    .map((message) => `${message.role === "northstar" ? "Northstar" : "User"}: ${message.content}`)
    .join("\n");

  return [
    "You are answering as Northstar Labs based only on the provided company and role profile.",
    "Be concise, conversational, and grounded.",
    "If the profile does not support a claim, say you do not have enough information rather than inventing details.",
    "Return plain text only.",
    `Job profile: ${JSON.stringify(jobProfile)}`,
    `Conversation so far:\n${transcript}`
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

function runMockJohnChat(input: {
  johnProfile: ParsedJohnProfile;
  messages: JohnChatMessage[];
}): JohnChatResult {
  const latestUserMessage = [...input.messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("A user question is required.");
  }

  return {
    mode: "mock",
    reply: answerJohnQuestion(input.johnProfile, latestUserMessage.content)
  };
}

function runMockCompanyChat(input: {
  jobProfile: ParsedJobProfile;
  messages: CompanyChatMessage[];
}): CompanyChatResult {
  const latestUserMessage = [...input.messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) {
    throw new Error("A user question is required.");
  }

  return {
    mode: "mock",
    reply: answerCompanyQuestion(input.jobProfile, latestUserMessage.content)
  };
}

function answerJohnQuestion(johnProfile: ParsedJohnProfile, question: string) {
  const loweredQuestion = question.toLowerCase();
  const name = johnProfile.identity?.name || "John";
  const summary = johnProfile.summary || "";
  const skills = johnProfile.skills || [];
  const preferredRoles = johnProfile.preferences?.preferred_roles || [];
  const workStyle = johnProfile.preferences?.work_style || [];
  const dealBreakers = johnProfile.preferences?.deal_breakers || [];
  const notes = johnProfile.notes || [];
  const noteMatch = findNoteMatch(notes, loweredQuestion);

  if (loweredQuestion.includes("kimchi")) {
    return summary.toLowerCase().includes("kimchi") || notes.some((note) => note.toLowerCase().includes("kimchi"))
      ? `Yes. Based on the available John context, ${name} likes kimchi.`
      : `I don't see anything in the current John context about ${name} liking kimchi.`;
  }

  if (loweredQuestion.includes("name")) {
    return `${name} is the name listed in the profile.`;
  }

  if (loweredQuestion.includes("where") || loweredQuestion.includes("location")) {
    return johnProfile.identity?.location
      ? `${name} is listed as being in ${johnProfile.identity.location}.`
      : `I don't see a location for ${name} in the profile.`;
  }

  if (loweredQuestion.includes("headline") || loweredQuestion.includes("what do i do")) {
    return johnProfile.identity?.headline
      ? `${name}'s profile headline is "${johnProfile.identity.headline}."`
      : `I don't see a headline in ${name}'s profile.`;
  }

  if (loweredQuestion.includes("skill")) {
    return skills.length
      ? `${name}'s listed skills are ${formatList(skills)}.`
      : `I don't see any skills listed for ${name}.`;
  }

  if (loweredQuestion.includes("role") || loweredQuestion.includes("job")) {
    return preferredRoles.length
      ? `${name} prefers roles in ${formatList(preferredRoles)}.`
      : `I don't see preferred roles listed in the profile.`;
  }

  if (loweredQuestion.includes("work style") || loweredQuestion.includes("workstyle") || loweredQuestion.includes("work")) {
    return workStyle.length
      ? `${name} prefers a ${formatList(workStyle)} work style.`
      : `I don't see work-style preferences in the profile.`;
  }

  if (loweredQuestion.includes("deal breaker") || loweredQuestion.includes("avoid")) {
    return dealBreakers.length
      ? `${name} wants to avoid ${formatList(dealBreakers)}.`
      : `I don't see any deal breakers listed in the profile.`;
  }

  if (loweredQuestion.includes("remote") || loweredQuestion.includes("hybrid")) {
    return johnProfile.preferences?.remote_preference
      ? `${name}'s remote preference is ${johnProfile.preferences.remote_preference}.`
      : `I don't see a remote preference in the profile.`;
  }

  if (loweredQuestion.includes("salary") || loweredQuestion.includes("compensation")) {
    return johnProfile.preferences?.salary_range
      ? `${name}'s listed salary range is ${johnProfile.preferences.salary_range}.`
      : `I don't see a salary range in the profile.`;
  }

  if (noteMatch) {
    return `From the extra John notes: ${noteMatch}`;
  }

  if (notes.length) {
    return `I do have extra John notes on file, but I can't confidently match that question to one of them yet.`;
  }

  if (summary) {
    return `Based on the profile, ${summary}`;
  }

  return "I don't have enough information in the current profile to answer that confidently.";
}

function answerCompanyQuestion(jobProfile: ParsedJobProfile, question: string) {
  const loweredQuestion = question.toLowerCase();
  const companyName = jobProfile.company?.name || "Northstar Labs";
  const summary = jobProfile.company?.summary || "";
  const cultureNotes = jobProfile.role?.culture_notes || [];
  const requiredSkills = jobProfile.role?.required_skills || [];
  const niceToHaveSkills = jobProfile.role?.nice_to_have_skills || [];
  const notes = jobProfile.company?.notes || [];
  const noteMatch = findNoteMatch(notes, loweredQuestion);

  if (loweredQuestion.includes("size") || loweredQuestion.includes("how big") || loweredQuestion.includes("employees")) {
    return jobProfile.company?.size
      ? `${companyName} is described as ${jobProfile.company.size}.`
      : `I don't see company size listed for ${companyName}.`;
  }

  if (loweredQuestion.includes("industry")) {
    return jobProfile.company?.industry
      ? `${companyName} is in ${jobProfile.company.industry}.`
      : `I don't see an industry listed for ${companyName}.`;
  }

  if (loweredQuestion.includes("location") || loweredQuestion.includes("where") || loweredQuestion.includes("hybrid")) {
    return jobProfile.role?.location_expectation
      ? `The role is listed as ${jobProfile.role.location_expectation}.`
      : `I don't see a location expectation for this role.`;
  }

  if (loweredQuestion.includes("salary") || loweredQuestion.includes("compensation") || loweredQuestion.includes("pay")) {
    return jobProfile.role?.compensation_band
      ? `The compensation band is ${jobProfile.role.compensation_band}.`
      : `I don't see a compensation band in the profile.`;
  }

  if (loweredQuestion.includes("culture")) {
    return cultureNotes.length
      ? `${companyName} describes the culture as ${formatList(cultureNotes)}.`
      : `I don't see culture notes for ${companyName}.`;
  }

  if (loweredQuestion.includes("skill") || loweredQuestion.includes("looking for") || loweredQuestion.includes("requirements")) {
    if (requiredSkills.length && niceToHaveSkills.length) {
      return `The role requires ${formatList(requiredSkills)} and would also value ${formatList(niceToHaveSkills)}.`;
    }

    if (requiredSkills.length) {
      return `The role requires ${formatList(requiredSkills)}.`;
    }

    return "I don't see required skills listed in the profile.";
  }

  if (loweredQuestion.includes("title") || loweredQuestion.includes("role") || loweredQuestion.includes("job")) {
    return jobProfile.role?.title
      ? `The role title is ${jobProfile.role.title}.`
      : `I don't see a role title in the profile.`;
  }

  if (noteMatch) {
    return `From the extra Northstar notes: ${noteMatch}`;
  }

  if (notes.length) {
    return `I do have extra Northstar notes on file, but I can't confidently match that question to one of them yet.`;
  }

  if (summary) {
    return `Based on the profile, ${summary}`;
  }

  return "I don't have enough information in the current company profile to answer that confidently.";
}

function findNoteMatch(notes: string[], loweredQuestion: string) {
  const tokens = loweredQuestion.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  return notes.find(
    (note) =>
      note.toLowerCase().includes(loweredQuestion) ||
      tokens.some((token) => note.toLowerCase().includes(token))
  );
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

function formatList(items: string[]) {
  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
