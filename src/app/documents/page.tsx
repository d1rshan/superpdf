import { DocumentsView } from "@/components/documents-view";

export default function DocumentsPage() {
  return (
    <div className="container-page">
      <header className="mb-10">
        <h1 className="font-editorial text-4xl">Documents</h1>
        <p className="mt-2 text-sm text-muted">
          Drop PDFs below. Each is parsed, chunked, and stripped down to facts
          with evidence.
        </p>
      </header>
      <DocumentsView />
    </div>
  );
}
