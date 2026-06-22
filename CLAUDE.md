# Lingua — agent notes

Personal single-user language-learning app (Spanish, Italian, French → fluency). Next.js 16 + Neon + Drizzle + Tailwind v4 + Anthropic Claude API. Port 3100. No auth.

## Layout
- `src/db/schema.ts` — language_progress, exercises, attempts, vocab (SM-2), lessons, speaking_logs. `src/db/index.ts` is a lazy Drizzle/Neon client (don't connect at import — build-time page collection runs without DATABASE_URL).
- `src/lib/ai.ts` — **server-only**. All Claude calls. Uses `output_config.format` (structured JSON) + adaptive thinking. Model from `ANTHROPIC_MODEL` (default `claude-opus-4-8`). Import its types into client components with `import type` only.
- `src/lib/languages.ts` — LangCode (es|it|fr), CEFR, skills, per-language metadata. Client-safe.
- `src/lib/data.ts` — server-only DB query helpers.
- `src/lib/srs.ts` — SM-2 scheduler (grades: again/hard/good/easy).
- `src/lib/api.ts` — client `postJSON` helper.
- `src/app/(app)/*` — pages (server components, `force-dynamic`); read `?lang=` (es default). Each renders a client session component.
- `src/app/api/*` — route handlers (generate/grade per skill). `maxDuration = 120` on AI routes.

## Conventions
- Selected language is carried in the `?lang=` query string; `AppNav` preserves it across links.
- CEFR level is resolved server-side via `getLevel(lang)` (falls back to the language's start level).
- Grading returns a `GradeResult` (score 0–100, summary, per-item corrections, strengths, nextSteps), rendered by `GradeFeedback`.
- XP is bumped via `touchStudied()` after graded work.

## Gotchas
- `db` is a Proxy — fine for queries; don't destructure methods off it before a request context exists.
- Speaking is paste-in only (no AI call); everything else grades live.
