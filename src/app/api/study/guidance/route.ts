import { NextRequest, NextResponse } from "next/server";
import { generateStudyGuidance } from "@/lib/ai";
import { getLearnerProfile } from "@/lib/data";
import { isLang } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { language } = await req.json();
    if (!isLang(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    const profile = await getLearnerProfile(language);
    const guidance = await generateStudyGuidance(profile);
    return NextResponse.json({ ...guidance, level: profile.level, targetLevel: profile.targetLevel });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
