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
