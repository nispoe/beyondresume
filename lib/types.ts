export type MessageRole = "employer" | "john" | "system";

export type TranscriptMessage = {
  role: MessageRole;
  content: string;
};

export type Scorecard = {
  skills: number;
  experience: number;
  culture: number;
  motivation: number;
  constraints: number;
};

export type MatchEvaluation = {
  overallRecommendation: "strong_match" | "possible_match" | "weak_match" | "not_a_match";
  confidence: number;
  summary: string;
  strengths: string[];
  risks: string[];
  openQuestions: string[];
  scores: Scorecard;
};

export type MatchResult = {
  mode: "mock" | "openai";
  transcript: TranscriptMessage[];
  evaluation: MatchEvaluation;
};

export type JohnChatRole = "user" | "john";

export type JohnChatMessage = {
  role: JohnChatRole;
  content: string;
};

export type JohnChatResult = {
  mode: "mock" | "openai";
  reply: string;
};

export type CompanyChatRole = "user" | "northstar";

export type CompanyChatMessage = {
  role: CompanyChatRole;
  content: string;
};

export type CompanyChatResult = {
  mode: "mock" | "openai";
  reply: string;
};
