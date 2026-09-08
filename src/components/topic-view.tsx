"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { isLowConfidence } from "@/lib/confidence";
import { qualifiersText } from "@/lib/qualifiers";
import { relationshipBadge, statusBadge, warnBadge } from "@/lib/status-badges";

type SelectedDocument = {
  id: string;
  filename: string;
  status: string;
  factCount: number;
};

type Topic = {
  id: string;
  name: string;
  status: string;
  documents: SelectedDocument[];
};

type DocumentRow = {
  id: string;
  filename: string;
  status: string;
  factCount: number;
  pageCount: number | null;
};

type Relationship = {
  id: string;
  type: "SAME_FACT" | "CONTRADICTS" | "CONTEXTUALIZES";
  explanation: string;
  confidence: number;
  a: RelatedFact;
  b: RelatedFact;
};

type RelatedFact = {
  id: string;
  documentId: string;
  entity: string;
  attribute: string;
  value: unknown;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
  pageNumber: number;
  confidence: number;
  evidenceQuote: string;
};

type Fact = RelatedFact & { documentId: string };

type EvidenceTarget = { fact: Fact; filename: string };

const TYPE_LABELS: Record<string, string> = {
  SAME_FACT: "Corroborated",
  CONTRADICTS: "Contradicted",
  CONTEXTUALIZES: "Contextualized",
};

function filenameOf(topic: Topic, documentId: string): string {
  return (
    topic.documents.find((d) => d.id === documentId)?.filename ?? "unknown"
  );
}

function FactCard({
  fact,
  label,
  onOpen,
}: {
  fact: RelatedFact;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-1 cursor-pointer rounded-md bg-raised p-3 text-left text-sm transition-colors hover:bg-surface"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          {label}
        </p>
        {isLowConfidence(fact) && <span className={warnBadge}>low conf</span>}
      </div>
      <p className="font-medium">{fact.entity}</p>
      <p>{fact.attribute}</p>
      <p className="text-muted">{String(fact.value)}</p>
      {qualifiersText(fact.qualifiers) && (
        <p className="text-xs text-muted">{qualifiersText(fact.qualifiers)}</p>
      )}
      <p className="mt-1 font-mono text-xs text-faint">
        p.{fact.pageNumber} · {Math.round(fact.confidence * 100)}%
      </p>
    </button>
  );
}

export function TopicView({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<(Topic & { status: string }) | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocumentRow[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [evidence, setEvidence] = useState<EvidenceTarget | null>(null);
  const processingRef = useRef(false);

  const refresh = useCallback(async () => {
    const [detailRes, docsRes, resultsRes] = await Promise.all([
      fetch(`/api/topics/${topicId}`),
      fetch("/api/documents"),
      fetch(`/api/topics/${topicId}/results`),
    ]);
    if (detailRes.ok) {
      const detail = await detailRes.json();
      processingRef.current = detail.status === "running";
      setTopic(detail);
      setCheckedIds(
        new Set(detail.documents.map((d: SelectedDocument) => d.id)),
      );
    }
    if (docsRes.ok) {
      const list: (DocumentRow & { factCount: number })[] =
        await docsRes.json();
      setAllDocuments(list.filter((d) => d.status === "done"));
    }
    if (resultsRes.ok) {
      const results = await resultsRes.json();
      setRelationships(results.relationships ?? []);
      setFacts(results.facts ?? []);
    }
  }, [topicId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      try {
        await refresh();
      } finally {
        timer = setTimeout(loop, processingRef.current ? 5000 : 15000);
      }
    };
    loop();
    return () => clearTimeout(timer);
  }, [refresh]);

  const toggleDocument = useCallback(
    async (documentId: string, selected: boolean) => {
      const current = [...checkedIds];
      const next = selected
        ? [...new Set([...current, documentId])]
        : current.filter((id) => id !== documentId);
      // ponytail: optimistic — checkbox flips instantly, the poll reconciles with the server
      setCheckedIds(new Set(next));
      fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: next }),
      });
    },
    [checkedIds, topicId],
  );

  const generate = useCallback(async () => {
    await fetch(`/api/topics/${topicId}/generate`, { method: "POST" });
    processingRef.current = true;
    await refresh();
  }, [topicId, refresh]);

  if (!topic) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const running = topic.status === "running";

  const query = search.trim().toLowerCase();
  const visibleFacts = facts.filter((fact) => {
    if (docFilter !== "all" && fact.documentId !== docFilter) return false;
    if (!query) return true;
    return [
      fact.entity,
      fact.attribute,
      String(fact.value),
      fact.evidenceQuote,
    ].some((s) => s.toLowerCase().includes(query));
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <Link href="/topics" className="text-sm text-muted hover:text-text">
            Topics
          </Link>
          <h1 className="font-editorial text-3xl">{topic.name}</h1>
        </div>
        <span className={statusBadge(topic.status)}>{topic.status}</span>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={running}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {topic.status === "done" ? "Regenerate" : "Generate"}
      </button>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-faint">
          Documents
        </h2>
        <div className="flex flex-col gap-2">
          {allDocuments.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="accent-accent"
                checked={checkedIds.has(doc.id)}
                disabled={running}
                onChange={(e) => toggleDocument(doc.id, e.target.checked)}
              />
              <span className="truncate">{doc.filename}</span>
              <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                {doc.factCount} facts
              </span>
            </label>
          ))}
          {allDocuments.length === 0 && (
            <p className="text-sm text-muted">
              No done documents yet — upload and extract first.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-faint">
          Relationships
        </h2>
        <div className="flex flex-col divide-y divide-line">
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const items = relationships.filter((r) => r.type === type);
            return (
              <details key={type} open={items.length > 0}>
                <summary className="flex cursor-pointer items-center gap-2 py-3 text-sm font-medium">
                  <span className={relationshipBadge(type)}>{label}</span>
                  <span className="text-muted">{items.length}</span>
                </summary>
                {items.length > 0 ? (
                  <ul className="flex flex-col gap-3 pb-4">
                    {items.map((rel) => (
                      <li
                        key={rel.id}
                        className="rounded-lg border border-line bg-surface p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {/* ponytail: same 0.5 threshold as Facts — bump per-type if reconciliation confidences cluster near it */}
                          {isLowConfidence(rel) && (
                            <span className={warnBadge}>low conf</span>
                          )}
                          <span className="font-mono text-xs text-muted">
                            confidence {Math.round(rel.confidence * 100)}%
                          </span>
                        </div>
                        <p className="mb-3 text-sm leading-relaxed">
                          {rel.explanation}
                        </p>
                        <div className="flex gap-3">
                          <FactCard
                            fact={rel.a}
                            label="Fact A"
                            onOpen={() =>
                              setEvidence({
                                fact: rel.a,
                                filename: filenameOf(topic, rel.a.documentId),
                              })
                            }
                          />
                          <FactCard
                            fact={rel.b}
                            label="Fact B"
                            onOpen={() =>
                              setEvidence({
                                fact: rel.b,
                                filename: filenameOf(topic, rel.b.documentId),
                              })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pb-4 text-sm text-muted">None.</p>
                )}
              </details>
            );
          })}
          {relationships.length === 0 && (
            <p className="text-sm text-muted">
              {running ? "Generating…" : "No relationships yet."}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-faint">
          All facts ({facts.length})
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="search"
            aria-label="Search facts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facts…"
            className="w-64 rounded-md border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <select
            aria-label="Filter by document"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="rounded-md border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="all">All documents</option>
            {topic.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename}
              </option>
            ))}
          </select>
        </div>
        <ul className="flex flex-col gap-2">
          {visibleFacts.map((fact) => (
            <li key={fact.id} className="rounded-md border border-line">
              <button
                type="button"
                onClick={() =>
                  setEvidence({
                    fact,
                    filename: filenameOf(topic, fact.documentId),
                  })
                }
                className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-raised"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{fact.entity}</span>
                  <span>{fact.attribute}</span>
                  <span className="text-muted">{String(fact.value)}</span>
                  {isLowConfidence(fact) && (
                    <span className={warnBadge}>low conf</span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs text-faint">
                    {filenameOf(topic, fact.documentId)} · p.{fact.pageNumber} ·{" "}
                    {Math.round(fact.confidence * 100)}%
                  </span>
                </div>
                {qualifiersText(fact.qualifiers) && (
                  <p className="text-xs text-muted">
                    {qualifiersText(fact.qualifiers)}
                  </p>
                )}
              </button>
            </li>
          ))}
          {visibleFacts.length === 0 && (
            <p className="text-sm text-muted">
              {facts.length === 0
                ? running
                  ? "Waiting for extraction…"
                  : "No facts."
                : "No facts match."}
            </p>
          )}
        </ul>
      </section>

      {evidence && (
        <EvidenceDrawer
          fact={evidence.fact}
          filename={evidence.filename}
          pageCount={
            allDocuments.find((d) => d.id === evidence.fact.documentId)
              ?.pageCount ?? null
          }
          onClose={() => setEvidence(null)}
        />
      )}
    </div>
  );
}
