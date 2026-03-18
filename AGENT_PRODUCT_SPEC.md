# John Matchmaker Agent System

## Goal

Build a two-agent system:

1. A "John" talent agent that emulates John in a realistic, bounded way.
2. An employer agent that interviews "John" to evaluate fit across skills, experience, working style, culture, goals, and constraints.

The system should help answer:

- Is this role a match for John?
- Where is the fit strong or weak?
- What questions remain unresolved?
- Should John advance, decline, or request clarification?

## Core Product Idea

Instead of a generic chatbot, this should behave like a structured simulation with guardrails:

- `John Agent` represents John's background, voice, preferences, and boundaries.
- `Employer Agent` represents a hiring manager or recruiter for a specific role.
- `Evaluator` scores the conversation and produces a fit report.

This gives a more useful outcome than free-form chat because the system can produce a final recommendation and evidence trail.

## Recommended MVP

### Inputs

- John's profile
  - resume
  - bio
  - skills
  - values
  - preferred roles
  - deal-breakers
  - salary expectations
  - location/time zone constraints
  - work style preferences
- Employer profile
  - company description
  - team culture
  - job description
  - required skills
  - preferred skills
  - compensation band
  - location/work arrangement
  - expectations and pain points

### Outputs

- conversation transcript
- fit score by category
- strengths
- risks/gaps
- unanswered questions
- recommendation
  - strong match
  - possible match
  - weak match
  - not a match

## High-Level Architecture

### 1. Profile ingestion

Convert raw documents into structured profiles.

Suggested schema:

```json
{
  "identity": {
    "name": "John",
    "headline": "Senior ...",
    "location": "..."
  },
  "skills": [
    {
      "name": "Product Strategy",
      "level": "strong",
      "evidence": ["Led ...", "Built ..."]
    }
  ],
  "experience": [
    {
      "company": "...",
      "role": "...",
      "highlights": ["...", "..."]
    }
  ],
  "preferences": {
    "role_types": ["..."],
    "industries": ["..."],
    "work_style": ["..."],
    "compensation": {
      "min": 0,
      "target": 0
    }
  },
  "constraints": {
    "must_have": ["..."],
    "deal_breakers": ["..."]
  },
  "voice": {
    "tone": ["direct", "warm", "thoughtful"]
  }
}
```

Do the same for the employer and role.

### 2. John agent

Responsibilities:

- answer as John
- stay grounded in actual evidence
- distinguish facts from inferences
- avoid inventing experience John does not have
- express preferences and questions honestly

Important rule:

If John's profile does not support a claim, the agent should say some version of:
"I don't have evidence for that yet" or "That seems adjacent, but not directly proven."

This matters more than style mimicry. Accuracy beats imitation.

### 3. Employer agent

Responsibilities:

- ask structured interview questions
- probe for skill fit, team fit, and motivation
- explain the role and environment
- surface possible mismatches
- gather enough signal for a recommendation

Question categories:

- core skills
- seniority and ownership
- communication style
- collaboration style
- ambiguity tolerance
- mission alignment
- compensation and logistics
- risk factors

### 4. Evaluator

After the conversation, run an evaluation pass that scores:

- skill match
- experience relevance
- culture/work-style fit
- motivation and goals fit
- compensation/location fit
- confidence level

Example scorecard:

```json
{
  "overall_recommendation": "possible_match",
  "scores": {
    "skills": 0.82,
    "experience": 0.75,
    "culture": 0.68,
    "motivation": 0.79,
    "constraints": 0.90
  },
  "strengths": [
    "...",
    "..."
  ],
  "risks": [
    "...",
    "..."
  ],
  "open_questions": [
    "...",
    "..."
  ]
}
```

## Conversation Design

Recommended flow:

1. Employer agent receives role profile and hiring goals.
2. John agent receives John's structured profile and persona instructions.
3. Employer agent interviews John for 6 to 12 turns.
4. John agent can ask follow-up questions about the role.
5. Evaluator reviews the transcript and both profiles.
6. System outputs a report and recommendation.

## Best Practice: Emulate With Boundaries

Do not position this as "a perfect clone of John."

Safer framing:

- "an AI representation of John based on supplied materials"
- "a simulation of how John may respond"
- "a decision-support interview agent"

This avoids overclaiming and reduces trust issues.

## Memory Model

Use three layers of memory:

### Static memory

Facts that define John:

- resume facts
- biography
- portfolio
- preferences
- values
- constraints

### Session memory

Facts gathered during the current role conversation:

- employer answers
- role-specific concerns
- unknowns to revisit

### Derived memory

Summaries and inferred traits, clearly marked as inferred rather than factual.

Rule:

Never let inferred memory overwrite factual memory.

## Prompting Strategy

### System prompt for John agent

Core behaviors:

- represent John faithfully using only provided evidence
- speak naturally and concisely
- if unsure, acknowledge uncertainty
- never fabricate skills, titles, results, or preferences
- prefer grounded examples from John's profile
- share enthusiasm only when justified by profile and role fit
- ask clarifying questions when role details affect fit

### System prompt for employer agent

Core behaviors:

- behave like a thoughtful recruiter or hiring manager
- ask targeted and progressively sharper questions
- test required skills and working style
- explain role realities honestly
- identify mismatch early rather than forcing fit

### System prompt for evaluator

Core behaviors:

- assess transcript against both structured profiles
- cite evidence for every major conclusion
- separate facts, inferences, and unknowns
- produce a recommendation with confidence

## Suggested Tech Stack

### Fastest MVP

- Frontend: Next.js
- Backend: Next.js API routes or a small Node service
- Database: Postgres with pgvector if you want retrieval later
- LLM: OpenAI Responses API
- Retrieval: embeddings over resume, portfolio, role docs

### Lean prototype alternative

- Frontend: simple chat UI in Next.js
- Backend: one API endpoint that orchestrates both agents
- Storage: JSON files or SQLite for early testing

## Suggested Data Model

Core entities:

- `person_profiles`
- `employer_profiles`
- `job_roles`
- `conversations`
- `messages`
- `evaluations`

Minimal tables:

```text
person_profiles(id, name, structured_json, source_docs_json, created_at)
employer_profiles(id, company_name, structured_json, source_docs_json, created_at)
job_roles(id, employer_profile_id, title, structured_json, created_at)
conversations(id, person_profile_id, job_role_id, started_at, completed_at, transcript_json)
evaluations(id, conversation_id, score_json, recommendation, created_at)
```

## Orchestration Logic

Pseudo-flow:

```text
ingest_john_profile()
ingest_employer_profile()
start_conversation()
for turn in range(8):
  employer_question = employer_agent(state)
  john_answer = john_agent(state, employer_question)
  save_messages()
evaluation = evaluator(full_transcript, john_profile, employer_profile, role)
return transcript + evaluation
```

## Risks To Design Around

### 1. Hallucinated self-representation

The John agent may invent background details unless tightly constrained.

Mitigation:

- structured profile first
- retrieval of supporting evidence
- prompt rule: no unsupported claims
- optional citation requirement for important claims

### 2. Fake certainty on cultural fit

Culture fit is often inferred too strongly from weak evidence.

Mitigation:

- produce confidence score
- separate "observed" from "assumed"
- require open questions section

### 3. Over-optimization for matching

If both agents try too hard to make it work, the system becomes biased.

Mitigation:

- employer agent must actively look for mismatches
- evaluator must include decline conditions

## MVP Success Criteria

The MVP is good enough if it can:

- ingest John's resume and a job description
- run a believable multi-turn interview
- avoid obvious fabrication
- produce a useful recommendation report
- clearly explain why the role is or is not a fit

## Build Order

1. Define JSON schema for John and employer/role profiles.
2. Build a profile ingestion step from pasted text or uploaded files.
3. Create the two-agent conversation loop.
4. Add evaluator scoring and recommendation output.
5. Add transcript view and fit report UI.
6. Add retrieval/citations for stronger factual grounding.

## Recommendation

If the goal is business value quickly, start with:

- one John profile
- one job description input
- one employer interviewer agent
- one evaluator
- transcript plus scorecard output

Do not start with voice cloning, avatar simulation, or deep persona mimicry.
Start with grounded decision support.

That will get you to a testable product much faster.
