"use client";

import { useState } from "react";

import { isLowConfidence } from "@/lib/confidence";
import { qualifiersText } from "@/lib/qualifiers";
import { neutralBadge, warnBadge } from "@/lib/status-badges";

export type FactWithEvidence = {
  documentId: string;
  pageNumber: number;
  evidenceQuote: string;
  confidence: number;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
};

export function EvidencePanel({
  fact,
  filename,
  pageCount,
  onClose,
}: {
  fact: FactWithEvidence;
  filename: string;
  pageCount: number | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(fact.pageNumber);
  const maxPage = pageCount ?? Math.max(fact.pageNumber, 1);

  const pdfUrl = `/api/documents/${fact.documentId}/pdf`;

  return (
    <section
      aria-label={`Evidence from ${filename}, page ${page}`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 font-mono text-xs uppercase tracking-widest text-faint">
          Evidence
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence panel"
          className="cursor-pointer rounded-md border border-line px-2 py-0.5 text-xs transition-colors hover:bg-raised"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-xs text-muted" title={filename}>
          {filename}
        </span>
        <span className={neutralBadge}>p.{fact.pageNumber}</span>
        <span className="font-mono text-xs text-faint">
          {Math.round(fact.confidence * 100)}%
        </span>
        {isLowConfidence(fact) && (
          <span className={warnBadge}>low confidence</span>
        )}
      </div>

      <blockquote className="rounded-md bg-raised p-3 text-sm leading-relaxed">
        “{fact.evidenceQuote}”
      </blockquote>

      {qualifiersText(fact.qualifiers) && (
        <p className="text-xs text-muted">{qualifiersText(fact.qualifiers)}</p>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs uppercase tracking-widest text-faint">
          Page
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="cursor-pointer rounded-md border border-line px-2 py-1 transition-colors hover:bg-raised disabled:cursor-default disabled:opacity-50"
        >
          ‹
        </button>
        <input
          type="number"
          aria-label="Page number"
          min={1}
          max={maxPage}
          value={page}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setPage(Math.min(maxPage, Math.max(1, n)));
          }}
          className="w-14 rounded-md border border-line bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
          disabled={page >= maxPage}
          aria-label="Next page"
          className="cursor-pointer rounded-md border border-line px-2 py-1 transition-colors hover:bg-raised disabled:cursor-default disabled:opacity-50"
        >
          ›
        </button>
        <span className="font-mono text-xs text-faint">of {maxPage}</span>
      </div>

      {/* ponytail: native browser PDF viewer via #page fragment — swap for pdf.js only if embedding/controls need to be ours */}
      <iframe
        key={page}
        title={`PDF page ${page}`}
        src={`${pdfUrl}#page=${page}&toolbar=1&view=FitH`}
        className="h-96 w-full rounded-md border border-line"
      />
    </section>
  );
}
