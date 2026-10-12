"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { confirmDocument, type ConfirmState } from "./actions";
import { validateDocument, type DocumentDraft } from "@/lib/documents";

type Path = (string | number)[];
type Kind = "text" | "number" | "date" | "textarea";

const TITLES: Record<DocumentDraft["tipo"], string> = {
  factura: "Factura",
  recibo: "Recibo",
  contrato: "Contrato",
  otro: "Otro documento",
};

function getAt(value: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (node, key) => (node as Record<string | number, unknown> | null)?.[key],
    value,
  );
}

function setAt<T>(doc: T, path: Path, value: unknown): T {
  const next = structuredClone(doc);
  const parent = getAt(next, path.slice(0, -1)) as Record<string | number, unknown>;
  parent[path[path.length - 1]] = value;
  return next;
}

export function DocumentForm({
  documentId,
  initial,
}: {
  documentId: string;
  initial: DocumentDraft;
}) {
  const [doc, setDoc] = useState(initial);
  const [saved, setSaved] = useState<ConfirmState>({ status: "idle" });
  const [saving, startSaving] = useTransition();
  const errors = validateDocument(doc);
  const errorCount = Object.keys(errors).length;

  function edit(path: Path, value: unknown) {
    setDoc((d) => setAt(d, path, value));
    // An edit makes the last confirmation outdated.
    setSaved({ status: "idle" });
  }

  function confirm(e: FormEvent) {
    e.preventDefault();
    startSaving(async () => setSaved(await confirmDocument(documentId, doc)));
  }

  const field = (label: string, path: Path, kind: Kind = "text") => (
    <Field
      key={path.join(".")}
      label={label}
      kind={kind}
      value={getAt(doc, path) as string | number | null}
      error={errors[path.join(".")]}
      onChange={(value) => edit(path, value)}
    />
  );

  const party = (title: string, key: string, extra?: ReactNode) => (
    <Section title={title}>
      {field("Nombre", [key, "nombre"])}
      {field("RFC / ID fiscal", [key, "identificacion_fiscal"])}
      {field("Dirección", [key, "direccion"])}
      {extra}
    </Section>
  );

  const lineItems = (items: { descripcion: string | null }[]) => (
    <Section title="Conceptos" wide>
      {items.length === 0 && (
        <p className="text-sm text-zinc-500">Sin conceptos.</p>
      )}
      {items.map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-2 border-b border-zinc-200 pb-3 last:border-0 sm:grid-cols-[1fr_5rem_6rem_6rem] dark:border-zinc-800"
        >
          <div className="col-span-2 sm:col-span-1">
            {field(`Descripción ${i + 1}`, ["conceptos", i, "descripcion"])}
          </div>
          {field("Cant.", ["conceptos", i, "cantidad"], "number")}
          {field("P. unit.", ["conceptos", i, "precio_unitario"], "number")}
          {field("Importe", ["conceptos", i, "importe"], "number")}
        </div>
      ))}
    </Section>
  );

  const totals = (
    <Section title="Importes">
      {field("Moneda", ["moneda"])}
      {field("Subtotal", ["subtotal"], "number")}
      {field("Impuestos", ["impuestos"], "number")}
      {field("Total", ["total"], "number")}
    </Section>
  );

  return (
    <form onSubmit={confirm} noValidate className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{TITLES[doc.tipo]}</h2>
        <p
          aria-live="polite"
          className={`text-sm ${errorCount ? "text-red-600" : "text-green-600"}`}
        >
          {errorCount
            ? `${errorCount} ${errorCount === 1 ? "campo por revisar" : "campos por revisar"}`
            : "Todos los campos son válidos"}
        </p>
      </header>

      {doc.tipo === "factura" && (
        <>
          <Section title="Datos generales">
            {field("Folio", ["folio"])}
            {field("Fecha de emisión", ["fecha_emision"], "date")}
            {field("Fecha de vencimiento", ["fecha_vencimiento"], "date")}
          </Section>
          {party("Emisor", "emisor")}
          {party("Receptor", "receptor")}
          {lineItems(doc.conceptos)}
          {totals}
        </>
      )}

      {doc.tipo === "recibo" && (
        <>
          <Section title="Datos generales">
            {field("Folio", ["folio"])}
            {field("Fecha", ["fecha"], "date")}
            {field("Método de pago", ["metodo_pago"])}
          </Section>
          {party("Comercio", "comercio")}
          {lineItems(doc.conceptos)}
          {totals}
        </>
      )}

      {doc.tipo === "contrato" && (
        <>
          <Section title="Datos generales">
            {field("Título", ["titulo"])}
            {field("Fecha de firma", ["fecha_firma"], "date")}
            {field("Inicio de vigencia", ["vigencia_inicio"], "date")}
            {field("Fin de vigencia", ["vigencia_fin"], "date")}
            {field("Monto", ["monto"], "number")}
            {field("Moneda", ["moneda"])}
            <div className="sm:col-span-2">
              {field("Objeto", ["objeto"], "textarea")}
            </div>
          </Section>
          <Section title="Partes" wide error={errors["partes"]}>
            {doc.partes.map((_, i) => (
              <div
                key={i}
                className="grid gap-2 border-b border-zinc-200 pb-3 last:border-0 sm:grid-cols-2 dark:border-zinc-800"
              >
                {field(`Nombre (parte ${i + 1})`, ["partes", i, "nombre"])}
                {field("Rol", ["partes", i, "rol"])}
                {field("RFC / ID fiscal", ["partes", i, "identificacion_fiscal"])}
                {field("Dirección", ["partes", i, "direccion"])}
              </div>
            ))}
          </Section>
          <Section title="Cláusulas clave" wide>
            {doc.clausulas_clave.length === 0 && (
              <p className="text-sm text-zinc-500">Sin cláusulas.</p>
            )}
            {doc.clausulas_clave.map((_, i) =>
              field(`Cláusula ${i + 1}`, ["clausulas_clave", i], "textarea"),
            )}
          </Section>
        </>
      )}

      {doc.tipo === "otro" && (
        <Section title="No es factura, recibo ni contrato" wide>
          {field("Descripción", ["descripcion"], "textarea")}
        </Section>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500">Ver JSON</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs dark:bg-zinc-900">
          {JSON.stringify(doc, null, 2)}
        </pre>
      </details>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p aria-live="polite" className="text-sm">
          {saved.status === "ok" && (
            <span className="text-green-600">
              Guardado · {saved.chunks}{" "}
              {saved.chunks === 1 ? "fragmento indexado" : "fragmentos indexados"}
            </span>
          )}
          {saved.status === "error" && (
            <span className="text-red-600">{saved.message}</span>
          )}
        </p>
        <button
          type="submit"
          disabled={saving || errorCount > 0}
          title={errorCount ? "Corrige los campos en rojo para confirmar" : undefined}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Guardando…" : "Confirmar y guardar"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  wide,
  error,
  children,
}: {
  title: string;
  wide?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className={wide ? "flex flex-col gap-3" : "grid gap-3 sm:grid-cols-2"}>
        {children}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  kind,
  value,
  error,
  onChange,
}: {
  label: string;
  kind: Kind;
  value: string | number | null;
  error?: string;
  onChange: (value: string | number | null) => void;
}) {
  const id = useId();
  const props = {
    id,
    value: value ?? "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    className: `w-full rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-2 ${
      error
        ? "border-red-500 text-red-700 focus:ring-red-500 dark:text-red-400"
        : "border-zinc-300 focus:ring-blue-500 dark:border-zinc-700"
    }`,
  };
  const emit = (raw: string) =>
    onChange(raw === "" ? null : kind === "number" ? Number(raw) : raw);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}
      >
        {label}
      </label>
      {kind === "textarea" ? (
        <textarea {...props} rows={3} onChange={(e) => emit(e.target.value)} />
      ) : (
        <input
          {...props}
          // Dates stay as text so a malformed extracted value remains visible.
          type={kind === "number" ? "number" : "text"}
          step={kind === "number" ? "any" : undefined}
          inputMode={kind === "number" ? "decimal" : undefined}
          placeholder={kind === "date" ? "AAAA-MM-DD" : undefined}
          onChange={(e) => emit(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
