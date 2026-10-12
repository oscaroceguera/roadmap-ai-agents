import { connection } from "next/server";
import { listSavedDocuments, type SavedDocument } from "@/lib/store";

const TYPE_LABELS: Record<SavedDocument["tipo"], string> = {
  factura: "Factura",
  recibo: "Recibo",
  contrato: "Contrato",
  otro: "Otro",
};

const COLUMNS = [
  { label: "Tipo" },
  { label: "Referencia" },
  { label: "Emisor / partes" },
  { label: "Fecha" },
  { label: "Importe", numeric: true },
  { label: "Fragmentos", numeric: true },
  { label: "Archivo" },
];

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso),
  );

const formatAmount = (amount: string, currency: string | null) =>
  currency
    ? new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
        Number(amount),
      )
    : amount;

export async function SavedDocuments() {
  // Fresh on every request; refreshed by confirmDocument's refresh().
  await connection();
  const documents = await listSavedDocuments();

  if (documents.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aún no hay documentos guardados. Confirma uno para verlo aquí.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
          <tr>
            {COLUMNS.map(({ label, numeric }) => (
              <th
                key={label}
                scope="col"
                className={`px-3 py-2 font-medium whitespace-nowrap ${numeric ? "text-right" : ""}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {documents.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2 whitespace-nowrap">{TYPE_LABELS[d.tipo]}</td>
              <td className="max-w-56 truncate px-3 py-2" title={d.referencia ?? undefined}>
                {d.referencia ?? "—"}
              </td>
              <td className="max-w-56 truncate px-3 py-2" title={d.contraparte ?? undefined}>
                {d.contraparte ?? "—"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {d.fecha ? formatDate(d.fecha) : "—"}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                {d.importe ? formatAmount(d.importe, d.moneda) : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{d.fragmentos}</td>
              <td className="max-w-48 truncate px-3 py-2 text-zinc-500" title={d.name}>
                {d.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
