import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vocab } from "@/db/schema";
import { review, type ReviewGrade } from "@/lib/srs";
import { touchStudied } from "@/lib/data";
import type { LangCode } from "@/lib/languages";

const GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

export async function POST(req: NextRequest) {
  try {
    const { id, grade } = await req.json();
    if (!id || !GRADES.includes(grade)) {
      return NextResponse.json({ error: "Missing id or grade" }, { status: 400 });
    }

    const [card] = await db.select().from(vocab).where(eq(vocab.id, id)).limit(1);
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const next = review(
      {
        ease: card.ease,
        intervalDays: card.intervalDays,
        reps: card.reps,
        lapses: card.lapses,
      },
      grade as ReviewGrade,
    );

    await db
      .update(vocab)
      .set({
        ease: next.ease,
        intervalDays: next.intervalDays,
        reps: next.reps,
        lapses: next.lapses,
        dueAt: next.dueAt,
      })
      .where(eq(vocab.id, id));

    await touchStudied(card.language as LangCode, 1);

    return NextResponse.json({ ok: true, dueAt: next.dueAt, intervalDays: next.intervalDays });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
