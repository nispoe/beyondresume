"use client";

import Image from "next/image";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { sampleJobProfile, sampleJohnProfile } from "@/lib/sample-data";
import {
  CompanyChatMessage,
  CompanyChatResult,
  EmailReportAudience,
  EmailReportResult,
  JohnChatMessage,
  JohnChatResult,
  MatchResult
} from "@/lib/types";

const initialJohnChatMessages: JohnChatMessage[] = [
  {
    role: "john",
    content: "Ask me about the John profile. For example: Do I like kimchi?"
  }
];

const initialCompanyChatMessages: CompanyChatMessage[] = [
  {
    role: "northstar",
    content: "Ask me about Northstar Labs. For example: How big is the company?"
  }
];

const placeholderAgents = ["Abhinav", "Daniel", "Garrett", "Amir", "Syed", "Prajesh", "Subu"];

const testimonials = [
  {
    name: "Maya R.",
    role: "Product leader",
    quote: "Beyond Resume helped me explain my story in a way that finally felt crisp, credible, and interview-ready.",
    rating: 5
  },
  {
    name: "Ethan C.",
    role: "Operations manager",
    quote: "The Beyond Persona framing gave me better examples, tighter answers, and way more confidence going into final rounds.",
    rating: 5
  },
  {
    name: "Priya S.",
    role: "Strategy candidate",
    quote: "It felt like having a mock interviewer and a positioning coach in the same workflow.",
    rating: 5
  },
  {
    name: "Jordan L.",
    role: "Program manager",
    quote: "I loved seeing strengths, risks, and follow-up questions in one place. It made my prep feel much more intentional.",
    rating: 4
  },
  {
    name: "Trevor K.",
    role: "Definitely not overprepared",
    quote: "One star. I only wanted a quick pep talk and accidentally walked into my interview sounding thoughtful, structured, and suspiciously competent.",
    rating: 1
  },
  {
    name: "Lena P.",
    role: "Emotionally available candidate",
    quote: "Three stars. The prep was excellent, but when it surfaced my actual strengths so clearly I had to sit in my car for ten minutes and process feelings.",
    rating: 3
  }
];

function formatSpeakerLabel(role: string) {
  if (role === "northstar" || role === "employer") {
    return "Northstar Labs";
  }

  if (role === "john") {
    return "John";
  }

  if (role === "user") {
    return "You";
  }

  return role;
}

export default function HomePage() {
  const [johnProfileText, setJohnProfileText] = useState(sampleJohnProfile);
  const [johnSupplementalContext, setJohnSupplementalContext] = useState("");
  const [jobProfileText, setJobProfileText] = useState(sampleJobProfile);
  const [companySupplementalContext, setCompanySupplementalContext] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saveJohnNotesError, setSaveJohnNotesError] = useState<string | null>(null);
  const [saveJohnNotesMessage, setSaveJohnNotesMessage] = useState<string | null>(null);
  const [isSavingJohnNotes, setIsSavingJohnNotes] = useState(false);

  const [saveCompanyNotesError, setSaveCompanyNotesError] = useState<string | null>(null);
  const [saveCompanyNotesMessage, setSaveCompanyNotesMessage] = useState<string | null>(null);
  const [isSavingCompanyNotes, setIsSavingCompanyNotes] = useState(false);

  const [johnChatMessages, setJohnChatMessages] = useState<JohnChatMessage[]>(initialJohnChatMessages);
  const [johnChatInput, setJohnChatInput] = useState("");
  const [johnChatError, setJohnChatError] = useState<string | null>(null);
  const [isJohnChatLoading, setIsJohnChatLoading] = useState(false);

  const [companyChatMessages, setCompanyChatMessages] = useState<CompanyChatMessage[]>(
    initialCompanyChatMessages
  );
  const [companyChatInput, setCompanyChatInput] = useState("");
  const [companyChatError, setCompanyChatError] = useState<string | null>(null);
  const [isCompanyChatLoading, setIsCompanyChatLoading] = useState(false);

  const [emailReportError, setEmailReportError] = useState<string | null>(null);
  const [emailReportMessage, setEmailReportMessage] = useState<string | null>(null);
  const [activeEmailAudience, setActiveEmailAudience] = useState<EmailReportAudience | null>(null);
  const [personaLeadEmail, setPersonaLeadEmail] = useState("");
  const [personaLeadMessage, setPersonaLeadMessage] = useState<string | null>(null);
  const [personaLeadError, setPersonaLeadError] = useState<string | null>(null);
  const [isPersonaLeadLoading, setIsPersonaLeadLoading] = useState(false);

  useEffect(() => {
    void hydrateStoredProfiles();
  }, []);

  async function hydrateStoredProfiles() {
    try {
      const response = await fetch("/api/profiles", {
        cache: "no-store"
      });
      const payload = (await response.json()) as {
        johnProfileText?: string;
        jobProfileText?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not load profiles.");
      }

      if (payload.johnProfileText) {
        setJohnProfileText(payload.johnProfileText);
      }

      if (payload.jobProfileText) {
        setJobProfileText(payload.jobProfileText);
      }
    } catch {
      // Keep the bundled sample JSON if the persisted fetch fails.
    }
  }

  async function sendPersonaLead() {
    const trimmedEmail = personaLeadEmail.trim();
    if (!trimmedEmail || isPersonaLeadLoading) {
      return;
    }

    setPersonaLeadError(null);
    setPersonaLeadMessage(null);
    setIsPersonaLeadLoading(true);

    try {
      const response = await fetch("/api/beyond-persona", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: trimmedEmail
        })
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not send your request.");
      }

      setPersonaLeadMessage(
        payload.message || "Thanks. We will follow up with more Beyond Persona information."
      );
      setPersonaLeadEmail("");
    } catch (leadError) {
      setPersonaLeadError(
        leadError instanceof Error ? leadError.message : "Something went wrong."
      );
    } finally {
      setIsPersonaLeadLoading(false);
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setEmailReportError(null);
    setEmailReportMessage(null);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          johnProfileText,
          johnSupplementalContext,
          jobProfileText,
          companySupplementalContext
        })
      });

      const payload = (await response.json()) as MatchResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Request failed.");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveJohnNotesToJson() {
    setSaveJohnNotesError(null);
    setSaveJohnNotesMessage(null);
    setIsSavingJohnNotes(true);

    try {
      const response = await fetch("/api/john-profile/save-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          johnProfileText,
          johnSupplementalContext
        })
      });

      const payload = (await response.json()) as {
        johnProfileText?: string;
        error?: string;
      };

      if (!response.ok || !payload.johnProfileText) {
        throw new Error(payload.error || "Could not save notes.");
      }

      setJohnProfileText(payload.johnProfileText);
      setJohnSupplementalContext("");
      setSaveJohnNotesMessage("John notes were saved into persistent storage.");
    } catch (saveError) {
      setSaveJohnNotesError(saveError instanceof Error ? saveError.message : "Something went wrong.");
    } finally {
      setIsSavingJohnNotes(false);
    }
  }

  async function saveCompanyNotesToJson() {
    setSaveCompanyNotesError(null);
    setSaveCompanyNotesMessage(null);
    setIsSavingCompanyNotes(true);

    try {
      const response = await fetch("/api/job-profile/save-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobProfileText,
          companySupplementalContext
        })
      });

      const payload = (await response.json()) as {
        jobProfileText?: string;
        error?: string;
      };

      if (!response.ok || !payload.jobProfileText) {
        throw new Error(payload.error || "Could not save notes.");
      }

      setJobProfileText(payload.jobProfileText);
      setCompanySupplementalContext("");
      setSaveCompanyNotesMessage("Northstar notes were saved into persistent storage.");
    } catch (saveError) {
      setSaveCompanyNotesError(
        saveError instanceof Error ? saveError.message : "Something went wrong."
      );
    } finally {
      setIsSavingCompanyNotes(false);
    }
  }

  async function sendEmailReport(audience: EmailReportAudience) {
    if (!result || activeEmailAudience) {
      return;
    }

    setEmailReportError(null);
    setEmailReportMessage(null);
    setActiveEmailAudience(audience);

    try {
      const response = await fetch("/api/email-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audience,
          result,
          johnProfileText,
          jobProfileText
        })
      });

      const payload = (await response.json()) as EmailReportResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not send email report.");
      }

      setEmailReportMessage(payload.message);
    } catch (sendError) {
      setEmailReportError(sendError instanceof Error ? sendError.message : "Something went wrong.");
    } finally {
      setActiveEmailAudience(null);
    }
  }

  async function askJohn() {
    const trimmedInput = johnChatInput.trim();
    if (!trimmedInput || isJohnChatLoading) {
      return;
    }

    const nextMessages: JohnChatMessage[] = [
      ...johnChatMessages,
      { role: "user", content: trimmedInput }
    ];
    setJohnChatMessages(nextMessages);
    setJohnChatInput("");
    setJohnChatError(null);
    setIsJohnChatLoading(true);

    try {
      const response = await fetch("/api/john-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          johnProfileText,
          johnSupplementalContext,
          messages: nextMessages
        })
      });

      const payload = (await response.json()) as JohnChatResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Chat request failed.");
      }

      setJohnChatMessages([
        ...nextMessages,
        {
          role: "john",
          content: payload.reply
        }
      ]);
    } catch (submissionError) {
      setJohnChatMessages(johnChatMessages);
      setJohnChatError(
        submissionError instanceof Error ? submissionError.message : "Something went wrong."
      );
    } finally {
      setIsJohnChatLoading(false);
    }
  }

  async function askNorthstar() {
    const trimmedInput = companyChatInput.trim();
    if (!trimmedInput || isCompanyChatLoading) {
      return;
    }

    const nextMessages: CompanyChatMessage[] = [
      ...companyChatMessages,
      { role: "user", content: trimmedInput }
    ];
    setCompanyChatMessages(nextMessages);
    setCompanyChatInput("");
    setCompanyChatError(null);
    setIsCompanyChatLoading(true);

    try {
      const response = await fetch("/api/company-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobProfileText,
          companySupplementalContext,
          messages: nextMessages
        })
      });

      const payload = (await response.json()) as CompanyChatResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Chat request failed.");
      }

      setCompanyChatMessages([
        ...nextMessages,
        {
          role: "northstar",
          content: payload.reply
        }
      ]);
    } catch (submissionError) {
      setCompanyChatMessages(companyChatMessages);
      setCompanyChatError(
        submissionError instanceof Error ? submissionError.message : "Something went wrong."
      );
    } finally {
      setIsCompanyChatLoading(false);
    }
  }

  function handleJohnChatKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askJohn();
    }
  }

  function handleCompanyChatKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askNorthstar();
    }
  }

  async function loadSamples() {
    setJohnSupplementalContext("");
    setCompanySupplementalContext("");
    setError(null);
    setSaveJohnNotesError(null);
    setSaveJohnNotesMessage(null);
    setSaveCompanyNotesError(null);
    setSaveCompanyNotesMessage(null);
    setJohnChatError(null);
    setCompanyChatError(null);
    setJohnChatMessages(initialJohnChatMessages);
    setCompanyChatMessages(initialCompanyChatMessages);
    setJohnChatInput("");
    setCompanyChatInput("");
    setEmailReportError(null);
    setEmailReportMessage(null);
    setActiveEmailAudience(null);
    setResult(null);
    await hydrateStoredProfiles();
  }

  const recommendationTone = result
    ? getRecommendationTone(result.evaluation.overallRecommendation)
    : "good";

  return (
    <main>
      <div className="topBand" aria-hidden="true">
        <div className="topBandNavy" />
        <div className="topBandBlue" />
        <div className="topBandGold" />
      </div>

      <section className="stage">
        <div className="heroShell">
          <div className="heroCopy">
            <span className="eyebrow">Talent Matching Prototype</span>
            <h1>Interview John before a human ever has to.</h1>
            <p>
              This prototype runs a short employer-to-John conversation, then returns a structured
              match report across skills, culture, motivation, and constraints.
            </p>

            <div className="heroLeadCard">
              <div>
                <h2>Get Your Beyond Persona</h2>
                <p>
                  Send your email to Beyond Resume and get more information about your own personal
                  Beyond Persona for interviews.
                </p>
              </div>
              <div className="heroLeadForm">
                <label className="srOnly" htmlFor="persona-lead-email">
                  Your email
                </label>
                <input
                  id="persona-lead-email"
                  type="email"
                  placeholder="you@example.com"
                  value={personaLeadEmail}
                  onChange={(event) => setPersonaLeadEmail(event.target.value)}
                />
                <button
                  className="button buttonPrimary"
                  disabled={isPersonaLeadLoading}
                  type="button"
                  onClick={() => void sendPersonaLead()}
                >
                  {isPersonaLeadLoading ? "Sending..." : "Send"}
                </button>
              </div>
              {personaLeadMessage ? <p className="status heroLeadStatus">{personaLeadMessage}</p> : null}
              {personaLeadError ? <p className="error heroLeadStatus">{personaLeadError}</p> : null}
            </div>
          </div>

          <div className="brandLockup" aria-label="Beyond Resume">
            <Image
              alt="Beyond Resume logo"
              className="brandLogo"
              height={388}
              priority
              src="/logo.png"
              width={576}
            />
          </div>
        </div>
      </section>

      <section className="testimonialBand">
        <div className="testimonialBandHeader">
          <span className="eyebrow">Testimonials</span>
          <h2>What people say about Beyond Resume</h2>
        </div>
        <div className="testimonialViewport">
          <div className="testimonialTrack">
            {[...testimonials, ...testimonials].map((item, index) => (
              <article className="testimonialCard" key={`${item.name}-${index}`}>
                <div className="testimonialStars" aria-label={`${item.rating} star rating`}>
                  {"★".repeat(item.rating)}
                </div>
                <p className="testimonialQuote">“{item.quote}”</p>
                <div className="testimonialMeta">
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page">
        <form className="grid" onSubmit={handleSubmit}>
          <div className="agentColumn">
            <section className="panel">
              <div className="panelHeader">
                <h2>John Agent</h2>
                <p>Paste John's structured profile JSON here.</p>
              </div>
              <div className="panelBody stack">
                <div className="field">
                  <label htmlFor="john-profile">Profile JSON</label>
                  <textarea
                    id="john-profile"
                    value={johnProfileText}
                    onChange={(event) => setJohnProfileText(event.target.value)}
                  />
                </div>

                <div className="field fieldCompact">
                  <label htmlFor="john-supplemental-context">Extra John Notes</label>
                  <textarea
                    id="john-supplemental-context"
                    value={johnSupplementalContext}
                    onChange={(event) => setJohnSupplementalContext(event.target.value)}
                    placeholder={"Add random facts here, one per line.\nExample: I love rainy Sundays.\nExample: I have a dog named Miso."}
                  />
                </div>

                <div className="actions actionsRight actionsTight">
                  <button className="button buttonPrimary" disabled={isSavingJohnNotes} type="button" onClick={() => void saveJohnNotesToJson()}>
                    {isSavingJohnNotes ? "Saving..." : "Update"}
                  </button>
                </div>
                {saveJohnNotesMessage ? <p className="status">{saveJohnNotesMessage}</p> : null}
                {saveJohnNotesError ? <p className="error">{saveJohnNotesError}</p> : null}

                <article className="card chatCard">
                  <div className="cardHeaderInline">
                    <div>
                      <h3>Ask John</h3>
                      <p className="cardSubtle">
                        Ask grounded questions about the profile or the extra notes you add here.
                      </p>
                    </div>
                  </div>

                  <div className="chatTranscript" aria-live="polite">
                    {johnChatMessages.map((message, index) => (
                      <div className={`chatBubble chatBubble-${message.role}`} key={`${message.role}-${index}`}>
                        <span className="messageRole">{formatSpeakerLabel(message.role)}</span>
                        <p>{message.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="chatComposer">
                    <label className="srOnly" htmlFor="john-chat-input">
                      Ask John a question
                    </label>
                    <input
                      id="john-chat-input"
                      onChange={(event) => setJohnChatInput(event.target.value)}
                      onKeyDown={handleJohnChatKeyDown}
                      placeholder="Do I have a dog named Miso?"
                      value={johnChatInput}
                    />
                    <button className="button buttonPrimary" disabled={isJohnChatLoading} type="button" onClick={() => void askJohn()}>
                      {isJohnChatLoading ? "Asking..." : "Ask John"}
                    </button>
                  </div>

                  {johnChatError ? <p className="error">{johnChatError}</p> : null}
                </article>
              </div>
            </section>

            <section className="panel placeholderAgentPanel placeholderTone-1">
              <div className="panelHeader">
                <h2>Your Beyond Persona Agent</h2>
                <p>Placeholder for another agent</p>
              </div>
            </section>

            {placeholderAgents.map((agentName, index) => (
              <section className={`panel placeholderAgentPanel placeholderTone-${index + 2}`} key={agentName}>
                <div className="panelHeader">
                  <h2>{agentName} Agent</h2>
                  <p>Placeholder for another agent</p>
                </div>
              </section>
            ))}
          </div>

          <div className="agentColumn">
            <section className="panel">
              <div className="panelHeader">
                <h2>Northstar Labs Agent</h2>
                <p>Paste the employer and role profile JSON here.</p>
              </div>
              <div className="panelBody stack">
              <div className="field">
                <label htmlFor="job-profile">Role JSON</label>
                <textarea
                  id="job-profile"
                  value={jobProfileText}
                  onChange={(event) => setJobProfileText(event.target.value)}
                />
              </div>

              <div className="field fieldCompact">
                <label htmlFor="company-supplemental-context">Extra Northstar Notes</label>
                <textarea
                  id="company-supplemental-context"
                  value={companySupplementalContext}
                  onChange={(event) => setCompanySupplementalContext(event.target.value)}
                  placeholder={"Add company notes here, one per line.\nExample: We are planning to open a second office.\nExample: We care a lot about customer empathy."}
                />
              </div>

              <div className="actions actionsRight actionsTight">
                <button className="button buttonPrimary" disabled={isSavingCompanyNotes} type="button" onClick={() => void saveCompanyNotesToJson()}>
                  {isSavingCompanyNotes ? "Saving..." : "Update"}
                </button>
              </div>
              {saveCompanyNotesMessage ? <p className="status">{saveCompanyNotesMessage}</p> : null}
              {saveCompanyNotesError ? <p className="error">{saveCompanyNotesError}</p> : null}

              <article className="card chatCard">
                <div className="cardHeaderInline">
                  <div>
                    <h3>Ask Northstar</h3>
                    <p className="cardSubtle">
                      Ask grounded questions about the company, role, or the extra notes you add here.
                    </p>
                  </div>
                </div>

                <div className="chatTranscript" aria-live="polite">
                  {companyChatMessages.map((message, index) => (
                    <div className={`chatBubble chatBubble-${message.role}`} key={`${message.role}-${index}`}>
                      <span className="messageRole">{formatSpeakerLabel(message.role)}</span>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>

                <div className="chatComposer">
                  <label className="srOnly" htmlFor="company-chat-input">
                    Ask Northstar a question
                  </label>
                  <input
                    id="company-chat-input"
                    onChange={(event) => setCompanyChatInput(event.target.value)}
                    onKeyDown={handleCompanyChatKeyDown}
                    placeholder="Are you opening a second office?"
                    value={companyChatInput}
                  />
                  <button className="button buttonPrimary" disabled={isCompanyChatLoading} type="button" onClick={() => void askNorthstar()}>
                    {isCompanyChatLoading ? "Asking..." : "Ask Northstar"}
                  </button>
                </div>

                {companyChatError ? <p className="error">{companyChatError}</p> : null}
              </article>
            </div>
            </section>

            <section className="panel placeholderAgentPanel placeholderTone-2">
              <div className="panelHeader">
                <h2>Your Beyond Company Persona Agent</h2>
                <p>Placeholder for another agent</p>
              </div>
            </section>
          </div>

          <section className="panel resultPanel">
            <div className="panelHeader">
              <h2>Beyond Resume Evaluator Agent</h2>
              <p>The employer interview transcript and final evaluation appear here.</p>
            </div>
            <div className="panelBody">
              {result ? (
                <div className="stack">
                  <article className={`card cardHighlight tone-${recommendationTone}`}>
                    <h3>Recommendation</h3>
                    <div className="recommendationRow">
                      <span className={`toneDot tone-${recommendationTone}`} />
                      <p>
                        <strong>{formatLabel(result.evaluation.overallRecommendation)}</strong>
                      </p>
                    </div>
                    <p>{result.evaluation.summary}</p>
                    <p>Confidence: {Math.round(result.evaluation.confidence * 100)}%</p>
                  </article>

                  <article className="card">
                    <h3>Scores</h3>
                    <div className="scoreGrid">
                      {Object.entries(result.evaluation.scores).map(([label, score]) => {
                        const tone = getScoreTone(score);
                        return (
                          <div className={`scoreItem tone-${tone}`} key={label}>
                            <div className="scoreItemHeader">
                              <span className="scoreLabel">{formatLabel(label)}</span>
                              <span className={`tonePill tone-${tone}`}>{formatTone(tone)}</span>
                            </div>
                            <strong>{Math.round(score * 100)}%</strong>
                            <div className="scoreBarTrack">
                              <div
                                className={`scoreBarFill tone-${tone}`}
                                style={{ width: `${Math.round(score * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  <article className="card">
                    <h3>Strengths</h3>
                    <ul className="list">
                      {result.evaluation.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Risks</h3>
                    <ul className="list">
                      {result.evaluation.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Open Questions</h3>
                    <ul className="list">
                      {result.evaluation.openQuestions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Email report</h3>
                    <p className="cardSubtle">
                      Send the latest match report.
                    </p>
                    <div className="actions">
                      <button
                        className="button buttonPrimary"
                        disabled={activeEmailAudience !== null}
                        type="button"
                        onClick={() => void sendEmailReport("john")}
                      >
                        {activeEmailAudience === "john" ? "Sending..." : "Send to John"}
                      </button>
                      <button
                        className="button buttonGhost"
                        disabled={activeEmailAudience !== null}
                        type="button"
                        onClick={() => void sendEmailReport("northstar")}
                      >
                        {activeEmailAudience === "northstar"
                          ? "Sending..."
                          : "Send to Northstar Labs"}
                      </button>
                    </div>
                    {emailReportMessage ? <p className="status">{emailReportMessage}</p> : null}
                    {emailReportError ? <p className="error">{emailReportError}</p> : null}
                  </article>

                  <article className="card">
                    <h3>Transcript</h3>
                    <div className="transcript">
                      {result.transcript.map((message, index) => (
                        <div className="message" key={`${message.role}-${index}`}>
                          <span className="messageRole">{formatSpeakerLabel(message.role)}</span>
                          <pre>{message.content}</pre>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              ) : (
                <div className="stack">
                  <article className="card cardEmpty">
                    <h3>Ready to run</h3>
                    <p>
                      Use the sample data or paste your own JSON, then run the match to generate an
                      interview transcript and recommendation.
                    </p>
                  </article>

                  <div className="actions actionsCenteredBelow">
                    <button className="button buttonPrimary" disabled={isLoading} type="submit">
                      {isLoading ? "Running interview..." : "Run match"}
                    </button>
                    <button className="button buttonGhost" onClick={() => void loadSamples()} type="button">
                      Load samples
                    </button>
                  </div>
                </div>
              )}
              {error ? <p className="error">{error}</p> : null}
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScoreTone(score: number) {
  if (score >= 0.8) {
    return "good";
  }

  if (score >= 0.6) {
    return "caution";
  }

  return "risk";
}

function getRecommendationTone(value: MatchResult["evaluation"]["overallRecommendation"]) {
  if (value === "strong_match") {
    return "good";
  }

  if (value === "possible_match" || value === "weak_match") {
    return "caution";
  }

  return "risk";
}

function formatTone(value: "good" | "caution" | "risk") {
  if (value === "good") {
    return "Strong";
  }

  if (value === "caution") {
    return "Mixed";
  }

  return "Risk";
}














