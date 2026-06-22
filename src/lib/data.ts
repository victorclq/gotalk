import "server-only";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  languageProgress,
  attempts,
  vocab,
  lessons,
  speakingLogs,
} from "@/db/schema";
import { LANGUAGES, type LangCode, type Cefr } from "./languages";

export async function getAllProgress() {
  return db.select().from(languageProgress).orderBy(languageProgress.language);
}

export async function getProgress(language: LangCode) {
  const rows = await db
    .select()
    .from(languageProgress)
    .where(eq(languageProgress.language, language))
    .limit(1);
  return rows[0] ?? null;
}

/** Current CEFR level for a language, falling back to the configured start level. */
export async function getLevel(language: LangCode): Promise<Cefr> {
  const p = await getProgress(language);
  return (p?.currentLevel as Cefr) ?? LANGUAGES[language].startLevel;
}

export async function touchStudied(language: LangCode, xpGain: number) {
  await db
    .update(languageProgress)
    .set({
      lastStudiedAt: new Date(),
      xp: sql`${languageProgress.xp} + ${xpGain}`,
    })
    .where(eq(languageProgress.language, language));
}

export async function recentAttempts(language: LangCode, limit = 10) {
  return db
    .select()
    .from(attempts)
    .where(eq(attempts.language, language))
    .orderBy(desc(attempts.createdAt))
    .limit(limit);
}

export async function dueVocab(language: LangCode, limit = 20) {
  return db
    .select()
    .from(vocab)
    .where(
      and(
        eq(vocab.language, language),
        eq(vocab.archived, false),
        lte(vocab.dueAt, new Date()),
      ),
    )
    .orderBy(vocab.dueAt)
    .limit(limit);
}

export async function vocabCounts(language: LangCode) {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      due: sql<number>`count(*) filter (where ${vocab.dueAt} <= now() and ${vocab.archived} = false)::int`,
    })
    .from(vocab)
    .where(eq(vocab.language, language));
  return rows[0] ?? { total: 0, due: 0 };
}

export async function listLessons(language: LangCode, limit = 50) {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.language, language))
    .orderBy(desc(lessons.createdAt))
    .limit(limit);
}

export async function listSpeakingLogs(language: LangCode, limit = 50) {
  return db
    .select()
    .from(speakingLogs)
    .where(eq(speakingLogs.language, language))
    .orderBy(desc(speakingLogs.createdAt))
    .limit(limit);
}

export interface LearnerProfile {
  language: LangCode;
  level: Cefr;
  targetLevel: string;
  totalAttempts: number;
  skillScores: { skill: string; avgScore: number; attempts: number }[];
  recentNextSteps: string[]; // AI's prior "next steps" guidance
  weakCorrections: string[]; // recent correction notes (errors the learner made)
  vocab: { total: number; due: number; lapsing: number };
  recentTopics: string[]; // study sessions already done
  speakingLogs: number;
}

/**
 * Compact summary of everything the app has learned about the user in this
 * language — fed to the AI so study sessions target real weak spots.
 */
export async function getLearnerProfile(language: LangCode): Promise<LearnerProfile> {
  const [progress, skillRows, recent, vCounts, lessonRows, speaking] = await Promise.all([
    getProgress(language),
    db
      .select({
        skill: attempts.skill,
        avgScore: sql<number>`coalesce(avg(${attempts.score}), 0)::int`,
        attempts: sql<number>`count(*)::int`,
      })
      .from(attempts)
      .where(eq(attempts.language, language))
      .groupBy(attempts.skill),
    db
      .select({ feedback: attempts.feedback })
      .from(attempts)
      .where(eq(attempts.language, language))
      .orderBy(desc(attempts.createdAt))
      .limit(12),
    db
      .select({
        total: sql<number>`count(*)::int`,
        due: sql<number>`count(*) filter (where ${vocab.dueAt} <= now() and ${vocab.archived} = false)::int`,
        lapsing: sql<number>`count(*) filter (where ${vocab.lapses} > 0)::int`,
      })
      .from(vocab)
      .where(eq(vocab.language, language)),
    db
      .select({ topic: lessons.topic })
      .from(lessons)
      .where(eq(lessons.language, language))
      .orderBy(desc(lessons.createdAt))
      .limit(8),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(speakingLogs)
      .where(eq(speakingLogs.language, language)),
  ]);

  const recentNextSteps: string[] = [];
  const weakCorrections: string[] = [];
  for (const r of recent) {
    const fb = r.feedback as
      | { nextSteps?: string; corrections?: { correct?: boolean; note?: string }[] }
      | null;
    if (fb?.nextSteps) recentNextSteps.push(fb.nextSteps);
    for (const c of fb?.corrections ?? []) {
      if (c.correct === false && c.note) weakCorrections.push(c.note);
    }
  }

  return {
    language,
    level: (progress?.currentLevel as Cefr) ?? LANGUAGES[language].startLevel,
    targetLevel: progress?.targetLevel ?? "C2",
    totalAttempts: skillRows.reduce((n, s) => n + s.attempts, 0),
    skillScores: skillRows,
    recentNextSteps: recentNextSteps.slice(0, 8),
    weakCorrections: weakCorrections.slice(0, 12),
    vocab: vCounts[0] ?? { total: 0, due: 0, lapsing: 0 },
    recentTopics: lessonRows.map((l) => l.topic),
    speakingLogs: speaking[0]?.n ?? 0,
  };
}
