import type { GradeResult } from "@/lib/ai";
import { Card, Badge } from "./ui";

export function ScoreRing({ score }: { score: number }) {
  const tone = score >= 75 ? "var(--positive)" : score >= 50 ? "var(--accent)" : "var(--negative)";
  return (
    <div
      className="w-20 h-20 rounded-full grid place-items-center shrink-0"
      style={{ background: `conic-gradient(${tone} ${score * 3.6}deg, var(--surface-2) 0deg)` }}
    >
      <div className="w-16 h-16 rounded-full bg-surface grid place-items-center">
        <span className="text-xl font-semibold">{Math.round(score)}</span>
      </div>
    </div>
  );
}

export function GradeFeedback({ result }: { result: GradeResult }) {
  return (
    <div className="space-y-4">
      <Card className="p-5 flex items-center gap-5">
        <ScoreRing score={result.score} />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Score</div>
          <p className="text-sm mt-1">{result.summary}</p>
        </div>
      </Card>

      {result.corrections?.length > 0 && (
        <Card className="divide-y divide-border">
          {result.corrections.map((c, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-2">
                <Badge tone={c.correct ? "green" : "red"}>{c.correct ? "✓" : "✕"}</Badge>
                <div className="flex-1 min-w-0">
                  {c.yourAnswer && (
                    <div className="text-sm">
                      <span className="text-muted">You:</span>{" "}
                      <span className={c.correct ? "" : "line-through text-negative"}>
                        {c.yourAnswer}
                      </span>
                    </div>
                  )}
                  {!c.correct && c.correctAnswer && (
                    <div className="text-sm">
                      <span className="text-muted">Correct:</span>{" "}
                      <span className="text-positive">{c.correctAnswer}</span>
                    </div>
                  )}
                  {c.note && <p className="text-sm text-muted mt-1">{c.note}</p>}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-positive mb-1">Strengths</div>
          <p className="text-sm">{result.strengths}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-accent mb-1">Next steps</div>
          <p className="text-sm">{result.nextSteps}</p>
        </Card>
      </div>
    </div>
  );
}
