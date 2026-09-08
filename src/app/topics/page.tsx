import { TopicsView } from "@/components/topics-view";

export default function TopicsPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <TopicsView />
      </div>
    </div>
  );
}
