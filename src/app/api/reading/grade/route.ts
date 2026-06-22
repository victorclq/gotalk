import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, attempts } from "@/db/schema";
import { gradeFreeText } from "@/lib/ai";
import { touchStudied } from "@/lib/data";
import type { LangCode, Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { exerciseId, response } = await req.json();
    if (!exerciseId || !response?.trim()) {
      return NextResponse.json({ error: "Missing exerciseId or response" }, { status: 400 });
    }

    const [ex] = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
    if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

    const questions = (ex.items as { id: number; prompt: string }[]) ?? [];
    const taskPrompt = `PASSAGE:\n${ex.passage}\n\nComprehension questions the learner should address:\n${questions
      .map((q) => `- ${q.prompt}`)
      .join("\n")}`;

    const result = await gradeFreeText({
      language: ex.language as LangCode,
      level: ex.level as Cefr,
      skill: "reading",
      prompt: taskPrompt,
      response,
    });

    await db.insert(attempts).values({
      exerciseId: ex.id,
      language: ex.language,
      skill: "reading",
      level: ex.level,
      answers: { response },
      score: result.score,
      feedback: result,
    });
    await touchStudied(ex.language as LangCode, Math.round(result.score / 10));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
