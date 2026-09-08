"use client";

import { useEffect, useState } from "react";

import { isLowConfidence } from "@/lib/confidence";
import { qualifiersText } from "@/lib/qualifiers";

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
        className="relative flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-white p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500">{filename}</p>
            <h2 className="text-lg font-semibold">Evidence</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLowConfidence(fact) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                low confidence
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            p.{fact.pageNumber}
          </span>
          <span className="text-xs text-zinc-500">
            {Math.round(fact.confidence * 100)}% confidence
          </span>
          {qualifiersText(fact.qualifiers) && (
            <span className="text-xs text-zinc-500">
              {qualifiersText(fact.qualifiers)}
            </span>
          )}
        </div>

        <blockquote className="rounded-lg bg-zinc-50 p-4 text-sm leading-relaxed">
          “{fact.evidenceQuote}”
        </blockquote>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-zinc-500">
            Jump to page
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-50"
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
            className="w-16 rounded-lg border border-zinc-300 px-2 py-1"
          />
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-50"
          >
            ›
          </button>
        </div>

        {/* ponytail: native browser PDF viewer via #page fragment — swap for pdf.js only if embedding/controls need to be ours */}
        <iframe
          key={page}
          title={`PDF page ${page}`}
          src={`${pdfUrl}#page=${page}&toolbar=1&view=FitH`}
          className="h-full min-h-96 w-full flex-1 rounded-lg border border-zinc-200"
        />
      </aside>
    </div>
  );
}
