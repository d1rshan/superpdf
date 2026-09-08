"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  entity: string;
  attribute: string;
  value: unknown;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
  pageNumber: number;
};

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-zinc-100 text-zinc-600",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  SAME_FACT: "Corroborated",
  CONTRADICTS: "Contradicted",
  CONTEXTUALIZES: "Contextualized",
};

const TYPE_STYLES: Record<string, string> = {
  SAME_FACT: "bg-green-100 text-green-800",
  CONTRADICTS: "bg-red-100 text-red-800",
  CONTEXTUALIZES: "bg-purple-100 text-purple-800",
};

function qualifiersText(q: RelatedFact["qualifiers"]): string {
  return [
    q.time && `time: ${q.time}`,
    q.scope && `scope: ${q.scope}`,
    q.location && `location: ${q.location}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function FactCard({ fact, label }: { fact: RelatedFact; label: string }) {
  return (
    <div className="flex-1 rounded-lg bg-zinc-50 p-3 text-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="font-medium">{fact.entity}</p>
      <p>{fact.attribute}</p>
      <p className="text-zinc-700">{String(fact.value)}</p>
      {qualifiersText(fact.qualifiers) && (
        <p className="text-xs text-zinc-500">
          {qualifiersText(fact.qualifiers)}
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-400">p.{fact.pageNumber}</p>
    </div>
  );
}

export function TopicView({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<(Topic & { status: string }) | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocumentRow[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
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
    }
    if (docsRes.ok) {
      const list: (DocumentRow & { factCount: number })[] =
        await docsRes.json();
      setAllDocuments(list.filter((d) => d.status === "done"));
    }
    if (resultsRes.ok) {
      const results = await resultsRes.json();
      setRelationships(results.relationships ?? []);
    }
  }, [topicId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      try {
        await refresh();
      } finally {
        timer = setTimeout(loop, processingRef.current ? 2000 : 10000);
      }
    };
    loop();
    return () => clearTimeout(timer);
  }, [refresh]);

  const toggleDocument = useCallback(
    async (documentId: string, selected: boolean) => {
      if (!topic) return;
      const current = topic.documents.map((d) => d.id);
      const next = selected
        ? [...new Set([...current, documentId])]
        : current.filter((id) => id !== documentId);
      await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: next }),
      });
      await refresh();
    },
    [topic, topicId, refresh],
  );

  const generate = useCallback(async () => {
    await fetch(`/api/topics/${topicId}/generate`, { method: "POST" });
    processingRef.current = true;
    await refresh();
  }, [topicId, refresh]);

  if (!topic) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const running = topic.status === "running";
  const selectedIds = new Set(topic.documents.map((d) => d.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/topics"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Topics
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {topic.name}
          </h1>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            STATUS_STYLES[topic.status] ?? STATUS_STYLES.idle
          }`}
        >
          {topic.status}
        </span>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={running}
        className="self-start rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
      >
        {topic.status === "done" ? "Regenerate" : "Generate"}
      </button>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Documents</h2>
        <div className="flex flex-col gap-2">
          {allDocuments.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(doc.id)}
                disabled={running}
                onChange={(e) => toggleDocument(doc.id, e.target.checked)}
              />
              <span className="truncate">{doc.filename}</span>
              <span className="ml-auto shrink-0 text-xs text-zinc-500">
                {doc.factCount} facts
              </span>
            </label>
          ))}
          {allDocuments.length === 0 && (
            <p className="text-sm text-zinc-500">
              No done documents yet — upload and extract first.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">
          Relationships
        </h2>
        <ul className="flex flex-col gap-3">
          {relationships.map((rel) => (
            <li key={rel.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    TYPE_STYLES[rel.type] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {TYPE_LABELS[rel.type] ?? rel.type}
                </span>
                <span className="text-xs text-zinc-500">
                  confidence {Math.round(rel.confidence * 100)}%
                </span>
              </div>
              <p className="mb-3 text-sm">{rel.explanation}</p>
              <div className="flex gap-3">
                <FactCard fact={rel.a} label="Fact A" />
                <FactCard fact={rel.b} label="Fact B" />
              </div>
            </li>
          ))}
          {relationships.length === 0 && (
            <p className="text-sm text-zinc-500">
              {running ? "Generating…" : "No relationships yet."}
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
