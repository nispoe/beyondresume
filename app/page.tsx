"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { sampleJobProfile, sampleJohnProfile } from "@/lib/sample-data";
import { MatchResult } from "@/lib/types";

export default function HomePage() {
  const [johnProfileText, setJohnProfileText] = useState(sampleJohnProfile);
  const [jobProfileText, setJobProfileText] = useState(sampleJobProfile);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          johnProfileText,
          jobProfileText
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

  function loadSamples() {
    setJohnProfileText(sampleJohnProfile);
    setJobProfileText(sampleJobProfile);
    setError(null);
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
              fit report across skills, culture, motivation, and constraints. It works in mock mode
              out of the box and can switch to OpenAI-backed orchestration when an API key is
              configured.
            </p>
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

      <main className="page">
        <form className="grid" onSubmit={handleSubmit}>
          <section className="panel">
            <div className="panelHeader">
              <h2>John Agentic Persona</h2>
              <p>Paste John's structured profile JSON here.</p>
            <p>Deployment check: this build is connected to GitHub and Vercel.</p>
            </div>
            <div className="panelBody">
              <div className="field">
                <label htmlFor="john-profile">Profile JSON</label>
                <textarea
                  id="john-profile"
                  value={johnProfileText}
                  onChange={(event) => setJohnProfileText(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2>Northstar Labs Agentic Persona</h2>
              <p>Paste the employer and role profile JSON here.</p>
            </div>
            <div className="panelBody">
              <div className="field">
                <label htmlFor="job-profile">Role JSON</label>
                <textarea
                  id="job-profile"
                  value={jobProfileText}
                  onChange={(event) => setJobProfileText(event.target.value)}
                />
              </div>

              <div className="actions">
                <button className="button buttonPrimary" disabled={isLoading} type="submit">
                  {isLoading ? "Running interview..." : "Run match"}
                </button>
                <button className="button buttonGhost" onClick={loadSamples} type="button">
                  Load samples
                </button>
              </div>

              <p className="status">
                Mode: {result?.mode || "not run yet"}
                {result?.mode === "mock" ? " (no API key detected)" : ""}
              </p>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </section>

          <section className="panel resultPanel">
            <div className="panelHeader">
              <h2>Beyond Resume Evaluator Persona</h2>
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
                    <h3>Transcript</h3>
                    <div className="transcript">
                      {result.transcript.map((message, index) => (
                        <div className="message" key={`${message.role}-${index}`}>
                          <span className="messageRole">{message.role}</span>
                          <pre>{message.content}</pre>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              ) : (
                <article className="card cardEmpty">
                  <h3>Ready to run</h3>
                  <p>
                    Use the sample data or paste your own JSON, then run the match to generate an
                    interview transcript and recommendation.
                  </p>
                </article>
              )}
            </div>
          </section>
        </form>
      </main>
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


