"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { statusBadge } from "@/lib/status-badges";

type TopicRow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-14" />
      ))}
    </div>
  );
}

export function TopicsView() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");

  const refresh = useCallback(async () => {
    // ponytail: loaded flips regardless of res.ok — a dead API shows empty state, not an endless skeleton
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        setTopics(await res.json());
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, documentIds: [] }),
    });
    if (res.ok) {
      const topic = await res.json();
      setName("");
      window.location.href = `/topics/${topic.id}`;
    }
  }, [name]);

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New workspace name"
          className="flex-1 rounded-md border border-line bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Create
        </button>
      </form>

      {!loaded ? (
        <ListSkeleton />
      ) : (
        <ul className="flex flex-col gap-3">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-faint"
            >
              <Link
                href={`/topics/${topic.id}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="truncate font-medium">{topic.name}</span>
                <span className={`shrink-0 ${statusBadge(topic.status)}`}>
                  {topic.status}
                </span>
              </Link>
            </li>
          ))}
          {topics.length === 0 && (
            <p className="text-sm text-muted">
              No workspaces yet — name one above to start comparing documents.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
