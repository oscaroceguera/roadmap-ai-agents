// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentForm } from "./document-form";
import {
  contratoCompleto,
  documentoNoReconocido,
  facturaCompleta,
  reciboCompleto,
} from "@/test/fixtures";

const { confirmDocument } = vi.hoisted(() => ({ confirmDocument: vi.fn() }));
vi.mock("./actions", () => ({ confirmDocument }));

beforeEach(() => {
  confirmDocument.mockReset().mockResolvedValue({ status: "ok", chunks: 2 });
});
afterEach(cleanup);

const group = (name: string) => screen.getByRole("group", { name });

function expectInvalid(input: HTMLElement, message: string) {
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input.className).toContain("border-red-500");
  expect(input).toHaveAccessibleDescription(message);
}

function expectValid(input: HTMLElement) {
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(input.className).not.toContain("border-red-500");
}

describe("DocumentForm", () => {
  it.each([
    ["Factura", facturaCompleta],
    ["Recibo", reciboCompleto],
    ["Contrato", contratoCompleto],
    ["Otro documento", documentoNoReconocido],
  ])("%s completo: sin campos en rojo", (title, doc) => {
    render(<DocumentForm documentId="42" initial={doc} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText("Todos los campos son válidos")).toBeInTheDocument();
    for (const field of screen.queryAllByRole("textbox")) expectValid(field);
  });

  it("muestra los valores extraídos en campos editables", () => {
    render(<DocumentForm documentId="42" initial={facturaCompleta} />);

    expect(screen.getByLabelText("Folio")).toHaveValue("A-1187");
    expect(within(group("Emisor")).getByLabelText("RFC / ID fiscal")).toHaveValue(
      "SNO990101XY2",
    );
    expect(screen.getByLabelText("Total")).toHaveValue(3480);
  });

  it("factura incompleta: campos obligatorios vacíos en rojo", () => {
    render(
      <DocumentForm
        documentId="42"
        initial={{
          ...facturaCompleta,
          folio: null,
          total: null,
          emisor: { ...facturaCompleta.emisor, identificacion_fiscal: null },
        }}
      />,
    );

    expect(screen.getByText("2 campos por revisar")).toBeInTheDocument();
    expectInvalid(screen.getByLabelText("Folio"), "Obligatorio");
    expectInvalid(screen.getByLabelText("Total"), "Obligatorio");
    // Optional fields stay neutral even when empty.
    expectValid(within(group("Emisor")).getByLabelText("RFC / ID fiscal"));
    expectValid(within(group("Receptor")).getByLabelText("RFC / ID fiscal"));
  });

  it("totales que no cuadran: total en rojo hasta corregirlo", async () => {
    const user = userEvent.setup();
    render(<DocumentForm documentId="42" initial={{ ...facturaCompleta, total: 3500 }} />);
    const total = screen.getByLabelText("Total");

    expectInvalid(total, "Subtotal + impuestos no coincide con el total");

    await user.clear(total);
    await user.type(total, "3480");

    expectValid(total);
    expect(screen.getByText("Todos los campos son válidos")).toBeInTheDocument();
  });

  it("fecha inválida: se muestra tal cual en rojo y se corrige al editarla", async () => {
    const user = userEvent.setup();
    render(<DocumentForm documentId="42" initial={{ ...facturaCompleta, fecha_emision: "15/09/2026" }} />);
    const fecha = screen.getByLabelText("Fecha de emisión");

    expect(fecha).toHaveValue("15/09/2026");
    expectInvalid(fecha, "Fecha inválida (AAAA-MM-DD)");

    await user.clear(fecha);
    await user.type(fecha, "2026-09-15");

    expectValid(fecha);
  });

  it("vaciar un campo obligatorio lo pone en rojo", async () => {
    const user = userEvent.setup();
    render(<DocumentForm documentId="42" initial={reciboCompleto} />);

    await user.clear(within(group("Comercio")).getByLabelText("Nombre"));

    expectInvalid(within(group("Comercio")).getByLabelText("Nombre"), "Obligatorio");
    expect(screen.getByText("1 campo por revisar")).toBeInTheDocument();
  });

  it("contrato con una sola parte: error en la sección Partes", () => {
    render(
      <DocumentForm
        documentId="42"
        initial={{ ...contratoCompleto, partes: [contratoCompleto.partes[0]] }}
      />,
    );

    expect(within(group("Partes")).getByRole("alert")).toHaveTextContent(
      "Un contrato necesita al menos dos partes",
    );
  });

  it("el JSON refleja las ediciones", async () => {
    const user = userEvent.setup();
    render(<DocumentForm documentId="42" initial={facturaCompleta} />);

    await user.clear(screen.getByLabelText("Folio"));
    await user.type(screen.getByLabelText("Folio"), "B-2");

    expect(screen.getByText(/"folio": "B-2"/)).toBeInTheDocument();
  });

  describe("confirmar", () => {
    const confirmButton = () => screen.getByRole("button", { name: "Confirmar y guardar" });

    it("deshabilitado mientras haya campos en rojo", async () => {
      const user = userEvent.setup();
      render(<DocumentForm documentId="42" initial={{ ...facturaCompleta, folio: null }} />);

      expect(confirmButton()).toBeDisabled();

      await user.type(screen.getByLabelText("Folio"), "A-1");

      expect(confirmButton()).toBeEnabled();
    });

    it("envía el id y los datos editados, y muestra lo guardado", async () => {
      const user = userEvent.setup();
      render(<DocumentForm documentId="42" initial={facturaCompleta} />);

      await user.clear(screen.getByLabelText("Folio"));
      await user.type(screen.getByLabelText("Folio"), "B-2");
      await user.click(confirmButton());

      expect(confirmDocument).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({ folio: "B-2" }),
      );
      expect(await screen.findByText("Guardado · 2 fragmentos indexados")).toBeInTheDocument();
    });

    it("muestra el error del servidor", async () => {
      confirmDocument.mockResolvedValue({
        status: "error",
        message: "No se pudo guardar el documento.",
      });
      const user = userEvent.setup();
      render(<DocumentForm documentId="42" initial={reciboCompleto} />);

      await user.click(confirmButton());

      expect(await screen.findByText("No se pudo guardar el documento.")).toBeInTheDocument();
    });

    it("editar después de guardar quita el aviso de guardado", async () => {
      const user = userEvent.setup();
      render(<DocumentForm documentId="42" initial={reciboCompleto} />);

      await user.click(confirmButton());
      await screen.findByText(/Guardado/);
      await user.type(screen.getByLabelText("Método de pago"), "!");

      expect(screen.queryByText(/Guardado/)).not.toBeInTheDocument();
    });
  });
});
