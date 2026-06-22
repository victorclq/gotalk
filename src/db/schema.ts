import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// ---- Shared vocab ----
// Languages are identified by ISO code: "es" | "it" | "fr".
// CEFR levels: "A1" | "A2" | "B1" | "B2" | "C1" | "C2".
// Skills: "grammar" | "vocabulary" | "reading" | "writing" | "speaking".

/**
 * One row per language being studied. Holds the current CEFR level (drives
 * difficulty auto-scaling) and the fluency target, plus light gamification.
 */
export const languageProgress = pgTable("language_progress", {
  id: serial("id").primaryKey(),
  language: text("language").notNull().unique(), // es | it | fr
  currentLevel: text("current_level").notNull(), // CEFR, e.g. "B1"
  targetLevel: text("target_level").notNull().default("C2"),
  xp: integer("xp").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastStudiedAt: timestamp("last_studied_at"),
  notes: text("notes"),
});

/**
 * An AI-generated exercise set. `items` holds the questions as JSON so each
 * skill can shape its own payload (MCQ, fill-blank, transform, translate...).
 */
export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    language: text("language").notNull(),
    skill: text("skill").notNull(), // grammar | vocabulary | reading | writing
    level: text("level").notNull(), // CEFR at generation time
    topic: text("topic"), // e.g. "subjunctive", "past tenses", free text
    title: text("title").notNull(),
    items: jsonb("items").notNull(), // ExerciseItem[]
    passage: text("passage"), // reading: the text to read
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("exercises_lang_skill_idx").on(t.language, t.skill)],
);

/**
 * A graded attempt at an exercise (or a free-text writing/reading response).
 * `feedback` holds the AI's structured correction payload.
 */
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id").references(() => exercises.id, {
      onDelete: "cascade",
    }),
    language: text("language").notNull(),
    skill: text("skill").notNull(),
    level: text("level").notNull(),
    answers: jsonb("answers"), // user's raw answers (array or text)
    score: real("score"), // 0..100
    feedback: jsonb("feedback"), // GradeResult
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("attempts_lang_idx").on(t.language, t.createdAt)],
);

/**
 * Spaced-repetition vocabulary item (SM-2 style scheduling).
 */
export const vocab = pgTable(
  "vocab",
  {
    id: serial("id").primaryKey(),
    language: text("language").notNull(),
    term: text("term").notNull(), // word/phrase in the target language
    translation: text("translation").notNull(), // English meaning
    example: text("example"), // example sentence in target language
    partOfSpeech: text("part_of_speech"),
    level: text("level"), // CEFR
    // SM-2 scheduling state
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("vocab_due_idx").on(t.language, t.dueAt)],
);

/**
 * AI-generated lessons & tips, kept so they can be browsed and re-read.
 */
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(),
  skill: text("skill").notNull(), // grammar | vocabulary | reading | writing | speaking
  level: text("level").notNull(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(), // markdown
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Speaking-practice log. You hold the conversation with an AI elsewhere, ask
 * it to evaluate you, and paste the evaluation text here to track progress.
 */
export const speakingLogs = pgTable("speaking_logs", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(),
  topic: text("topic"),
  durationMin: integer("duration_min"),
  evaluation: text("evaluation").notNull(), // pasted AI feedback
  score: real("score"), // optional self/AI score 0..100
  level: text("level"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LanguageProgress = typeof languageProgress.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Vocab = typeof vocab.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type SpeakingLog = typeof speakingLogs.$inferSelect;
