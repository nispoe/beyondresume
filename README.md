# John Matchmaker Agent

This is a text-first MVP scaffold for a two-agent job matching system:

- `John agent`: answers as a grounded representation of John
- `Employer agent`: interviews John for a specific role
- `Evaluator`: scores fit and explains strengths, risks, and open questions

## What is included

- Next.js app scaffold
- simple web UI
- `/api/match` route
- sample John and job JSON
- JSON schemas
- mock mode when no API key is configured
- OpenAI-backed orchestration path when `OPENAI_API_KEY` is available

## Local setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local`.
4. Add `OPENAI_API_KEY`.
5. Optionally set `OPENAI_MODEL`.
6. Start the app:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- If `OPENAI_API_KEY` is missing, the app falls back to a deterministic mock engine so the UI still works.
- The mock engine is only for development. It is not a realistic interview model.
