"use client";

import { useEffect, useState } from "react";

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

export function EvidenceDrawer({
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pdfUrl = `/api/documents/${fact.documentId}/pdf`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close evidence drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Evidence from ${filename}, page ${page}`}
        className="relative flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto border-l border-line bg-canvas p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-faint">
              {filename}
            </p>
            <h2 className="font-editorial text-2xl">Evidence</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLowConfidence(fact) && (
              <span className={warnBadge}>low confidence</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-2 py-1 text-sm transition-colors hover:bg-raised"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={neutralBadge}>p.{fact.pageNumber}</span>
          <span className="font-mono text-xs text-muted">
            {Math.round(fact.confidence * 100)}% confidence
          </span>
          {qualifiersText(fact.qualifiers) && (
            <span className="text-xs text-muted">
              {qualifiersText(fact.qualifiers)}
            </span>
          )}
        </div>

        <blockquote className="rounded-md bg-raised p-4 text-sm leading-relaxed">
          “{fact.evidenceQuote}”
        </blockquote>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs uppercase tracking-widest text-faint">
            Jump to page
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-line px-2 py-1 transition-colors hover:bg-raised disabled:opacity-50"
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
              if (Number.isFinite(n))
                setPage(Math.min(maxPage, Math.max(1, n)));
            }}
            className="w-16 rounded-md border border-line bg-transparent px-2 py-1 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="rounded-md border border-line px-2 py-1 transition-colors hover:bg-raised disabled:opacity-50"
          >
            ›
          </button>
        </div>

        {/* ponytail: native browser PDF viewer via #page fragment — swap for pdf.js only if embedding/controls need to be ours */}
        <iframe
          key={page}
          title={`PDF page ${page}`}
          src={`${pdfUrl}#page=${page}&toolbar=1&view=FitH`}
          className="h-full min-h-96 w-full flex-1 rounded-md border border-line"
        />
      </aside>
    </div>
  );
}
