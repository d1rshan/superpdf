import { TopicsView } from "@/components/topics-view";

export default function TopicsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <div className="flex flex-col gap-8">
        <h1 className="font-editorial text-3xl">Workspaces</h1>
        <TopicsView />
      </div>
    </div>
  );
}
