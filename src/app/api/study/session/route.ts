import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exercises, lessons } from "@/db/schema";
import { generateStudySession } from "@/lib/ai";
import { getLearnerProfile } from "@/lib/data";
import { isLang } from "@/lib/languages";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, focus } = body ?? {};
    if (!isLang(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    const profile = await getLearnerProfile(language);
    const session = await generateStudySession({ profile, focus: focus?.trim() || undefined });

    // Persist the embedded exercises as a gradeable set (answers stay server-side).
    let exerciseId: number | null = null;
    if (session.exercises.length > 0) {
      const [exRow] = await db
        .insert(exercises)
        .values({
          language,
          skill: session.primarySkill === "vocabulary" ? "vocabulary" : "grammar",
          level: profile.level,
          topic: session.focus,
          title: `${session.title} — practice`,
          items: session.exercises,
        })
        .returning({ id: exercises.id });
      exerciseId = exRow.id;
    }

    // Strip answers from the plan stored/returned to the client.
    const clientPlan = {
      ...session,
      exercises: session.exercises.map((it) => ({
        id: it.id,
        kind: it.kind,
        prompt: it.prompt,
        options: it.options ?? null,
      })),
    };

    const [row] = await db
      .insert(lessons)
      .values({
        language,
        skill: session.primarySkill,
        level: profile.level,
        topic: session.focus,
        title: session.title,
        plan: clientPlan,
        estimatedMinutes: session.estimatedMinutes,
        exerciseId,
      })
      .returning({ id: lessons.id, createdAt: lessons.createdAt });

    return NextResponse.json({
      id: row.id,
      createdAt: row.createdAt,
      level: profile.level,
      exerciseId,
      plan: clientPlan,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
