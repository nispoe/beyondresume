import { NextResponse } from "next/server";
import { EmailReportAudience, MatchResult, MessageRole } from "@/lib/types";

type JohnEmailProfile = {
  identity?: {
    email?: string;
  };
};

type JobEmailProfile = {
  company?: {
    email?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      audience?: EmailReportAudience;
      result?: MatchResult;
      johnProfileText?: string;
      jobProfileText?: string;
    };

    if (!body.result || !isEmailAudience(body.audience)) {
      return NextResponse.json(
        { error: "Both a valid audience and a match result are required." },
        { status: 400 }
      );
    }

    if (!body.johnProfileText || !body.jobProfileText) {
      return NextResponse.json(
        { error: "Both johnProfileText and jobProfileText are required to send email reports." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "Set RESEND_API_KEY and RESEND_FROM_EMAIL before sending email reports." },
        { status: 500 }
      );
    }

    const recipient = getRecipientEmail({
      audience: body.audience,
      johnProfileText: body.johnProfileText,
      jobProfileText: body.jobProfileText
    });
    const subject = body.audience === "john" ? "John Agent" : "Northstar Labs Agent";
    const text = buildEmailText(body.result, body.audience);
    const html = buildEmailHtml(body.result, body.audience);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [recipient],
        subject,
        text,
        html
      })
    });

    if (!resendResponse.ok) {
      const failureText = await resendResponse.text();
      return NextResponse.json(
        { error: "Email send failed: " + (failureText || resendResponse.statusText) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Sent the " + subject + " report to " + recipient + "."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isEmailAudience(value: string | undefined): value is EmailReportAudience {
  return value === "john" || value === "northstar";
}

function getRecipientEmail(input: {
  audience: EmailReportAudience;
  johnProfileText: string;
  jobProfileText: string;
}) {
  const johnProfile = JSON.parse(input.johnProfileText) as JohnEmailProfile;
  const jobProfile = JSON.parse(input.jobProfileText) as JobEmailProfile;
  const recipient =
    input.audience === "john" ? johnProfile.identity?.email : jobProfile.company?.email;

  if (!recipient) {
    throw new Error(
      input.audience === "john"
        ? "John profile is missing identity.email."
        : "Northstar Labs profile is missing company.email."
    );
  }

  return recipient;
}

function buildEmailText(result: MatchResult, audience: EmailReportAudience) {
  const subject = audience === "john" ? "John Agent" : "Northstar Labs Agent";
  const scoreLines = Object.entries(result.evaluation.scores)
    .map(([label, score]) => formatLabel(label) + ": " + Math.round(score * 100) + "%")
    .join("\n");
  const transcriptLines = result.transcript
    .map((message) => formatSpeaker(message.role) + ": " + message.content)
    .join("\n\n");

  return [
    subject + " match report",
    "",
    "Overall recommendation: " + formatLabel(result.evaluation.overallRecommendation),
    "Confidence: " + Math.round(result.evaluation.confidence * 100) + "%",
    "",
    "Summary",
    result.evaluation.summary,
    "",
    "Scores",
    scoreLines,
    "",
    "Strengths",
    result.evaluation.strengths.map((item) => "- " + item).join("\n"),
    "",
    "Risks",
    result.evaluation.risks.map((item) => "- " + item).join("\n"),
    "",
    "Open Questions",
    result.evaluation.openQuestions.map((item) => "- " + item).join("\n"),
    "",
    "Transcript",
    transcriptLines
  ].join("\n");
}

function buildEmailHtml(result: MatchResult, audience: EmailReportAudience) {
  const subject = audience === "john" ? "John Agent" : "Northstar Labs Agent";
  const scoreItems = Object.entries(result.evaluation.scores)
    .map(
      ([label, score]) =>
        "<li><strong>" +
        escapeHtml(formatLabel(label)) +
        ":</strong> " +
        Math.round(score * 100) +
        "%</li>"
    )
    .join("");
  const strengthItems = result.evaluation.strengths
    .map((item) => "<li>" + escapeHtml(item) + "</li>")
    .join("");
  const riskItems = result.evaluation.risks
    .map((item) => "<li>" + escapeHtml(item) + "</li>")
    .join("");
  const questionItems = result.evaluation.openQuestions
    .map((item) => "<li>" + escapeHtml(item) + "</li>")
    .join("");
  const transcriptItems = result.transcript
    .map(
      (message) =>
        "<p><strong>" +
        escapeHtml(formatSpeaker(message.role)) +
        ":</strong> " +
        escapeHtml(message.content) +
        "</p>"
    )
    .join("");

  return (
    "<!doctype html>" +
    '<html><body style="font-family: Georgia, Times New Roman, serif; color: #1f3550; line-height: 1.5;">' +
    "<h1>" +
    escapeHtml(subject) +
    " match report</h1>" +
    "<p><strong>Overall recommendation:</strong> " +
    escapeHtml(formatLabel(result.evaluation.overallRecommendation)) +
    "</p>" +
    "<p><strong>Confidence:</strong> " +
    Math.round(result.evaluation.confidence * 100) +
    "%</p>" +
    "<h2>Summary</h2>" +
    "<p>" +
    escapeHtml(result.evaluation.summary) +
    "</p>" +
    "<h2>Scores</h2><ul>" +
    scoreItems +
    "</ul>" +
    "<h2>Strengths</h2><ul>" +
    strengthItems +
    "</ul>" +
    "<h2>Risks</h2><ul>" +
    riskItems +
    "</ul>" +
    "<h2>Open Questions</h2><ul>" +
    questionItems +
    "</ul>" +
    "<h2>Transcript</h2>" +
    transcriptItems +
    "</body></html>"
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSpeaker(role: MessageRole) {
  if (role === "employer") {
    return "Northstar Labs";
  }

  if (role === "john") {
    return "John";
  }

  return "System";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
