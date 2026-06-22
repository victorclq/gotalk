// SM-2 spaced-repetition scheduler.
// quality: 0 = blackout, 3 = correct but hard, 5 = perfect recall.
// We expose a 4-button UI (Again/Hard/Good/Easy) mapped to qualities 1/3/4/5.

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

export type ReviewGrade = "again" | "hard" | "good" | "easy";

const GRADE_QUALITY: Record<ReviewGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function review(state: SrsState, grade: ReviewGrade, now: Date = new Date()): SrsResult {
  const q = GRADE_QUALITY[grade];
  let { ease, intervalDays, reps, lapses } = state;

  if (q < 3) {
    // Lapse — reset interval, keep card in rotation soon.
    reps = 0;
    lapses += 1;
    intervalDays = 0; // due again same session (~10 min handled by caller if desired)
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
  }

  // Update ease factor (SM-2 formula), floored at 1.3.
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const dueAt = new Date(now);
  if (intervalDays <= 0) {
    dueAt.setMinutes(dueAt.getMinutes() + 5); // re-show shortly
  } else {
    dueAt.setDate(dueAt.getDate() + intervalDays);
  }

  return { ease, intervalDays, reps, lapses, dueAt };
}
