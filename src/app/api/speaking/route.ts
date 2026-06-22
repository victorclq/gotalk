import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { speakingLogs } from "@/db/schema";
import { getLevel, touchStudied } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, topic, durationMin, evaluation, score } = body ?? {};
    if (!isLang(language) || !evaluation?.trim()) {
      return NextResponse.json({ error: "Missing language or evaluation" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const [row] = await db
      .insert(speakingLogs)
      .values({
        language,
        topic: topic ?? null,
        durationMin: durationMin ? Number(durationMin) : null,
        evaluation,
        score: score != null ? Number(score) : null,
        level,
      })
      .returning({ id: speakingLogs.id });

    await touchStudied(language, 5);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
