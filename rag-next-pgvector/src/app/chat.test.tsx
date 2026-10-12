// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chat } from "./chat";

const chat = vi.hoisted(() => ({
  messages: [] as UIMessage[],
  status: "ready" as string,
  error: undefined as Error | undefined,
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@ai-sdk/react", () => ({ useChat: () => chat }));

const source = (n: number, title: string, filename: string) => ({
  type: "source-document" as const,
  sourceId: String(n),
  mediaType: "application/pdf",
  title,
  filename,
});

const question: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "¿Cuánto le pagué a Servicios Norte?" }],
};

function answer(text: string): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [
      source(1, "Factura A-2201", "factura-ok.pdf"),
      source(2, "Contrato Arrendamiento", "renta.pdf"),
      { type: "text", text },
    ],
  };
}

beforeEach(() => {
  Object.assign(chat, { messages: [], status: "ready", error: undefined });
  chat.sendMessage.mockReset();
});
afterEach(cleanup);

describe("Chat", () => {
  it("envía la pregunta y limpia el campo", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Pregunta"), "¿Total de la factura?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(chat.sendMessage).toHaveBeenCalledWith({ text: "¿Total de la factura?" });
    expect(screen.getByLabelText("Pregunta")).toHaveValue("");
  });

  it("no envía preguntas vacías", () => {
    render(<Chat />);
    expect(screen.getByRole("button", { name: "Preguntar" })).toBeDisabled();
  });

  it("muestra la cita enlazada y sólo los documentos citados como fuentes", () => {
    chat.messages = [question, answer("Le pagaste 3,480.00 MXN [1].")];
    render(<Chat />);

    const cita = screen.getByRole("link", { name: "1" });
    expect(cita).toHaveAttribute("title", "Factura A-2201 · factura-ok.pdf");
    expect(cita).toHaveAttribute("href", "#fuente-a1-1");

    const fuentes = screen.getByRole("list");
    expect(within(fuentes.parentElement!).getByText("Fuentes")).toBeInTheDocument();
    expect(within(fuentes).getAllByRole("listitem")).toHaveLength(1);
    expect(fuentes).toHaveTextContent("[1] Factura A-2201 · factura-ok.pdf");
    expect(screen.queryByText(/renta\.pdf/)).not.toBeInTheDocument();
  });

  it("varias citas en una respuesta", () => {
    chat.messages = [question, answer("Pagaste 3,480 [1] y la renta es 15,000 [2].")];
    render(<Chat />);

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("si la respuesta no cita nada, muestra los documentos consultados", () => {
    chat.messages = [question, answer("No lo indican los documentos.")];
    render(<Chat />);

    expect(screen.getByText("Documentos consultados")).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("estado de búsqueda, detener y error con reintento", async () => {
    const user = userEvent.setup();
    chat.status = "submitted";
    const { rerender } = render(<Chat />);

    expect(screen.getByText("Buscando en los documentos…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Detener" }));
    expect(chat.stop).toHaveBeenCalled();

    Object.assign(chat, { status: "error", error: new Error("boom") });
    rerender(<Chat />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(chat.regenerate).toHaveBeenCalled();
  });
});
