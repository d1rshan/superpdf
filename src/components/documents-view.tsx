"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { statusBadge } from "@/lib/status-badges";

type DocumentRow = {
  id: string;
  filename: string;
  status: string;
  pageCount: number | null;
  factCount: number;
  error: string | null;
};

const ACTIVE_STATUSES = new Set(["uploading", "parsing", "extracting"]);

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

export function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processingRef = useRef(false);

  const refresh = useCallback(async () => {
    // ponytail: loaded flips regardless of res.ok — a dead API shows empty + error state, not an endless skeleton
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const list: DocumentRow[] = await res.json();
        processingRef.current = list.some((d) => ACTIVE_STATUSES.has(d.status));
        setDocuments(list);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await refresh();
      timer = setTimeout(loop, processingRef.current ? 5000 : 15000);
    };
    loop();
    return () => clearTimeout(timer);
  }, [refresh]);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        await fetch("/api/documents", { method: "POST", body: formData });
        await refresh();
      } finally {
        setUploading(false);
      }
    },
    [refresh],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  return (
    <div className="flex flex-col gap-6">
      <label
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent-dim"
            : "border-line hover:border-faint"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative, hidden from assistive tech */}
        <svg
          aria-hidden
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-8 text-faint"
        >
          <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
          <path d="M14 3v4h4" />
          <path d="M9 13h6M9 17h6" />
        </svg>
        <span className="font-medium">
          {uploading ? "Uploading…" : "Drop a PDF here or click to browse"}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-faint">
          parsed · chunked · facts extracted
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </label>

      {!loaded ? (
        <ListSkeleton />
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-faint"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="truncate font-medium">{doc.filename}</span>
                <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted">
                  {doc.pageCount != null && (
                    <span>
                      {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                    </span>
                  )}
                  {doc.status === "done" && (
                    <span>
                      {doc.factCount} {doc.factCount === 1 ? "fact" : "facts"}
                    </span>
                  )}
                  <span className={statusBadge(doc.status)}>{doc.status}</span>
                </div>
              </div>
              {doc.error && (
                <p className="text-sm text-badge-error-text">{doc.error}</p>
              )}
            </li>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-muted">
              No documents yet — drop a PDF above to start.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
