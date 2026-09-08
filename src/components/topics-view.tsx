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

export function TopicsView() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [name, setName] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/topics");
    if (res.ok) setTopics(await res.json());
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
          placeholder="New topic name"
          className="flex-1 rounded-md border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform hover:opacity-90 active:scale-[0.98]"
        >
          Create
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="rounded-lg border border-line bg-surface p-4"
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
          <p className="text-sm text-muted">No topics yet.</p>
        )}
      </ul>
    </div>
  );
}
