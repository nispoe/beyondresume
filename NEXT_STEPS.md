# Next Steps

## Immediate Goal

Build a small prototype that can:

- accept a John profile
- accept a job description
- run a short employer-to-John interview
- produce a fit report

## Phase 1: Define Inputs

Create the minimum data you need before writing orchestration code.

### John profile

Prepare:

- resume text
- short bio
- top skills
- industries of interest
- preferred roles
- work-style preferences
- deal-breakers
- salary range
- location and remote preferences

### Employer/job profile

Prepare:

- company summary
- role title
- job description
- required skills
- nice-to-have skills
- culture/team notes
- compensation band
- location/remote expectations

## Phase 2: Create Structured Schemas

Turn both inputs into JSON shapes.

Build first:

- `john-profile.schema.json`
- `job-profile.schema.json`
- `evaluation.schema.json`

Why this matters:

- makes the agents more consistent
- reduces hallucination
- makes scoring easier

## Phase 3: Build The Simplest Working Backend

Start with one backend route that does all orchestration.

Suggested API flow:

1. accept John profile and job profile
2. generate a structured employer opening question
3. run 6 to 10 turns between employer and John
4. pass transcript to evaluator
5. return transcript and scorecard

Recommended early stack:

- Next.js app router
- one API route
- OpenAI Responses API
- JSON file storage or SQLite

## Phase 4: Build A Barebones UI

You do not need a polished product yet.

Start with three panels:

- left: John profile input
- middle: job description input
- right: transcript and fit report

Minimum outputs:

- transcript
- overall recommendation
- scores by category
- strengths
- risks
- open questions

## Phase 5: Add Guardrails

Before making it prettier, make it trustworthy.

Implement:

- strict prompts that forbid unsupported claims
- role and profile summaries passed as structured JSON
- confidence score in evaluation
- separate sections for facts vs inferences vs unknowns

Optional next:

- citation snippets showing where John's answers came from

## Phase 6: Test With Real Scenarios

Run at least 5 to 10 job descriptions through the prototype.

Check:

- did John agent fabricate anything?
- did employer agent ask useful questions?
- were mismatch cases surfaced early?
- did the evaluator produce believable recommendations?

## Best Order Of Work

1. write schemas
2. create sample John and job JSON files
3. scaffold app
4. implement conversation loop
5. implement evaluator
6. build simple UI
7. test on real postings

## Strong Recommendation

Your first version should be text-only.

Do not start with:

- voice cloning
- avatar simulation
- long-term memory across jobs
- automated outbound recruiting

Start with:

- one John profile
- one role at a time
- one transcript
- one recommendation

## What I Can Build Next

The most useful next implementation step is:

1. scaffold the Next.js app and API
2. add JSON schemas and sample profile files
3. wire the two-agent conversation plus evaluator

That would give you a real MVP foundation instead of just planning documents.
