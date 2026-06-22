# Go Talk — ES · IT · FR fluency trainer

A personal, single-user web app to push Spanish, Italian, and French from a good base toward full fluency. Exercises, reading, and writing are done **in the app** and graded live by Claude; speaking practice happens elsewhere (an AI conversation) and you paste the evaluation back in to track it.

- **Stack:** Next.js 16 · React 19 · Neon (Postgres) · Drizzle ORM · Tailwind v4 · Anthropic Claude API
- **Port:** 3100
- **Auth:** none (single user, local)

## Skills

| Skill | What it does |
|------|--------------|
| 📐 **Grammar** | AI generates a mixed drill set at your level (MCQ, fill-blank, transform, translate); submit answers → instant per-item correction + score. |
| 🗂️ **Vocabulary** | Spaced-repetition flashcards (SM-2). Generate themed batches; review with Again/Hard/Good/Easy. |
| 📖 **Reading** | AI writes a level-appropriate passage; you explain what you understood in the target language → comprehension + language feedback. |
| ✍️ **Writing** | AI gives a prompt; you write a response → graded corrections (grammar, vocab range, register). |
| 🎙️ **Speaking** | Log AI conversation evaluations (paste the feedback) and track scores over time. |
| 📚 **Study** | Adaptive study coach. Generates a **1–2 hour guided session** built from your in-app history (past scores, weak skills, recurring mistakes): objectives, timed learn/practice sections, a graded exercise set, and native-speech **YouTube** suggestions. Also gives a **roadmap to fluency** (what to focus on next, milestones to C2). |

Levels start at **ES B1 · IT B2 · FR C1** and target **C2**. Difficulty auto-scales to each language's current CEFR level (stored per language, editable in the DB).

## Setup

1. **Install deps** (already done): `npm install`
2. **Create a Neon project** at https://console.neon.tech and copy the pooled connection string.
3. **Get an Anthropic API key** at https://console.anthropic.com.
4. **Fill `.env.local`:**
   ```
   DATABASE_URL="postgresql://…?sslmode=require"
   ANTHROPIC_API_KEY="sk-ant-…"
   ANTHROPIC_MODEL="claude-opus-4-8"   # or claude-sonnet-4-6 / claude-haiku-4-5 for lower cost
   ```
5. **Create tables and seed the three languages:**
   ```
   npm run db:push
   npm run seed
   ```
6. **Run:** `npm run dev` → http://localhost:3100

## How the AI works

All generation and grading goes through `src/lib/ai.ts` using the official `@anthropic-ai/sdk`:
- **Structured outputs** (`output_config.format`) guarantee valid JSON for exercises, vocab, passages, lessons, and grades.
- **Adaptive thinking** is on for sharper pedagogy.
- Model is configurable via `ANTHROPIC_MODEL` (defaults to `claude-opus-4-8`).

## Scripts

- `npm run dev` — dev server on :3100
- `npm run build` / `npm run start` — production
- `npm run db:push` — push schema to Neon
- `npm run db:studio` — Drizzle Studio
- `npm run seed` — seed language_progress rows
