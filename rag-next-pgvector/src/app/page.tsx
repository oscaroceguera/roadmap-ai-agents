import { Suspense } from "react";
import { Chat } from "./chat";
import { SavedDocuments } from "./saved-documents";
import { Uploader } from "./uploader";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">RAG · Documentos</h1>
        <p className="text-zinc-500">
          Sube una factura, recibo o contrato (imagen o PDF), revisa los datos
          extraídos y confírmalos para guardarlos.
        </p>
      </header>
      <Uploader />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Preguntar a los documentos</h2>
        <Chat />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Documentos guardados</h2>
        <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
          <SavedDocuments />
        </Suspense>
      </section>
    </main>
  );
}
