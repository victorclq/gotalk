import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { generateReading } from "@/lib/ai";
import { getLevel } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, topic } = body ?? {};
    if (!isLang(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const r = await generateReading({ language, level, topic });

    const [row] = await db
      .insert(exercises)
      .values({
        language,
        skill: "reading",
        level,
        topic: topic ?? null,
        title: r.title,
        items: r.questions,
        passage: r.passage,
      })
      .returning({ id: exercises.id });

    return NextResponse.json({
      exerciseId: row.id,
      title: r.title,
      level,
      passage: r.passage,
      questions: r.questions.map((q) => ({ id: q.id, prompt: q.prompt })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
