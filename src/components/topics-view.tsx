"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TopicRow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-zinc-100 text-zinc-600",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
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
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-green-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Create
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {topics.map((topic) => (
          <li key={topic.id} className="rounded-xl border border-zinc-200 p-4">
            <Link
              href={`/topics/${topic.id}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate font-medium">{topic.name}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[topic.status] ?? STATUS_STYLES.idle
                }`}
              >
                {topic.status}
              </span>
            </Link>
          </li>
        ))}
        {topics.length === 0 && (
          <p className="text-sm text-zinc-500">No topics yet.</p>
        )}
      </ul>
    </div>
  );
}
