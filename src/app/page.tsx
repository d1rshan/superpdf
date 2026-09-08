import { DocumentsView } from "@/components/documents-view";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="font-editorial text-3xl">Documents</h1>
        <DocumentsView />
      </div>
    </div>
  );
}
