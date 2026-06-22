import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { generateLesson } from "@/lib/ai";
import { getLevel } from "@/lib/data";
import { isLang, type Cefr, type Skill } from "@/lib/languages";

export const maxDuration = 120;

const SKILLS: Skill[] = ["grammar", "vocabulary", "reading", "writing", "speaking"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, skill, topic } = body ?? {};
    if (!isLang(language) || !SKILLS.includes(skill) || !topic?.trim()) {
      return NextResponse.json({ error: "Missing language, skill, or topic" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const lesson = await generateLesson({ language, skill, level, topic });

    const [row] = await db
      .insert(lessons)
      .values({
        language,
        skill,
        level,
        topic,
        title: lesson.title,
        body: lesson.body,
      })
      .returning();

    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
