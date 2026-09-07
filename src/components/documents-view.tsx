"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DocumentRow = {
  id: string;
  filename: string;
  status: string;
  pageCount: number | null;
  error: string | null;
};

const ACTIVE_STATUSES = new Set(["uploading", "parsing"]);

const BADGE_STYLES: Record<string, string> = {
  uploading: "bg-amber-100 text-amber-800",
  parsing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) setDocuments(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    const processing = documents.some((d) => ACTIVE_STATUSES.has(d.status));
    const interval = setInterval(refresh, processing ? 2000 : 10000);
    return () => clearInterval(interval);
  }, [refresh, documents]);

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
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-green-600 bg-green-50"
            : "border-zinc-300 hover:border-zinc-400"
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
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="truncate font-medium">{doc.filename}</span>
              <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-500">
                {doc.pageCount != null && (
                  <span>
                    {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    BADGE_STYLES[doc.status] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {doc.status}
                </span>
              </div>
            </div>
            {doc.error && <p className="text-sm text-red-600">{doc.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
