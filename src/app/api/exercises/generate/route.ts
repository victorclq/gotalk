import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { generateExercises } from "@/lib/ai";
import { getLevel } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, skill, topic, count } = body ?? {};
    if (!isLang(language) || (skill !== "grammar" && skill !== "vocabulary")) {
      return NextResponse.json({ error: "Invalid language or skill" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const generated = await generateExercises({ language, skill, level, topic, count });

    const [row] = await db
      .insert(exercises)
      .values({
        language,
        skill,
        level,
        topic: topic ?? null,
        title: generated.title,
        items: generated.items,
      })
      .returning({ id: exercises.id });

    // Strip answers/explanations before sending to the client.
    const items = generated.items.map((it) => ({
      id: it.id,
      kind: it.kind,
      prompt: it.prompt,
      options: it.options ?? null,
    }));

    return NextResponse.json({ exerciseId: row.id, title: generated.title, level, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
