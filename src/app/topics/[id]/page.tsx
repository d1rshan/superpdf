import { TopicView } from "@/components/topic-view";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12">
      <TopicView topicId={id} />
    </div>
  );
}
