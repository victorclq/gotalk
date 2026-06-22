import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, attempts } from "@/db/schema";
import { gradeExercise, type ExerciseItem } from "@/lib/ai";
import { touchStudied } from "@/lib/data";
import type { LangCode, Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { exerciseId, answers } = await req.json();
    if (!exerciseId || typeof answers !== "object") {
      return NextResponse.json({ error: "Missing exerciseId or answers" }, { status: 400 });
    }

    const [ex] = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
    if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

    const items = ex.items as ExerciseItem[];
    const result = await gradeExercise({
      language: ex.language as LangCode,
      level: ex.level as Cefr,
      items,
      answers,
    });

    await db.insert(attempts).values({
      exerciseId: ex.id,
      language: ex.language,
      skill: ex.skill,
      level: ex.level,
      answers,
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
