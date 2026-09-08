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

export function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processingRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const list: DocumentRow[] = await res.json();
      processingRef.current = list.some((d) => ACTIVE_STATUSES.has(d.status));
      setDocuments(list);
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
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <label
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center transition-colors ${
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
        <span className="font-medium">
          {uploading ? "Uploading…" : "Drop a PDF here or click to browse"}
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

      <ul className="flex flex-col gap-3">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
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
      </ul>
    </div>
  );
}
