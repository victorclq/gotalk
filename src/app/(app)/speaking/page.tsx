import { listSpeakingLogs } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { SpeakingLogForm } from "@/components/SpeakingLogForm";

export const dynamic = "force-dynamic";

export default async function SpeakingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const logs = await listSpeakingLogs(lang);

  return (
    <div>
      <PageHeader
        title="🎙️ Speaking"
        subtitle={`${LANGUAGES[lang].name} · log AI conversation evaluations`}
      />
      <div className="space-y-6">
        <SpeakingLogForm lang={lang} />

        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">History</h2>
        {logs.length === 0 ? (
          <EmptyState
            icon="🎙️"
            title="No speaking logs yet"
            description="After an AI conversation, paste its evaluation above to start tracking your speaking progress."
          />
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="font-medium">{l.topic || "Conversation"}</span>
                    {l.durationMin != null && (
                      <span className="text-muted"> · {l.durationMin} min</span>
                    )}
                    <span className="text-muted">
                      {" "}
                      · {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {l.score != null && (
                    <Badge tone={l.score >= 75 ? "green" : l.score >= 50 ? "amber" : "red"}>
                      {Math.round(l.score)}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted">{l.evaluation}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
