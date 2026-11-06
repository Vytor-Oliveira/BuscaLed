import type { Ticket } from "../api/tickets";
import { numeroTicket } from "./ticket";
import { montarLinkWhatsApp, montarMensagem } from "./whatsapp";

const ticketBase: Ticket = {
  id: "t-1",
  userId: "u-1",
  userEmail: "cliente@example.com",
  customerPhone: "47999990000",
  vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
  status: "PENDENTE",
  createdAt: "2026-10-13T12:00:00.000Z",
  updatedAt: "2026-10-13T12:00:00.000Z",
  items: [
    {
      id: "i-1",
      ledModelId: "led-1",
      ledModelSku: "SHK-S14-H4",
      ledModelName: "Ultraled S14 H4",
      originalLedModelId: null,
      position: "FAROL_BAIXO",
      quantity: 2,
    },
  ],
};

describe("montarLinkWhatsApp", () => {
  it("acrescenta o código do país em número brasileiro", () => {
    expect(montarLinkWhatsApp("47999990000")).toBe("https://wa.me/5547999990000");
  });

  it("ignora pontuação que a pessoa digitou", () => {
    expect(montarLinkWhatsApp("(47) 99999-0000")).toBe("https://wa.me/5547999990000");
  });

  it("não duplica o código do país quando já vem", () => {
    expect(montarLinkWhatsApp("5547999990000")).toBe("https://wa.me/5547999990000");
  });

  it("recusa número curto demais para ser válido", () => {
    expect(montarLinkWhatsApp("123")).toBeNull();
  });

  it("anexa a mensagem pré-formatada quando ela é passada (RF24)", () => {
    const link = montarLinkWhatsApp("47999990000", "Olá, tudo bem?");
    expect(link).toBe("https://wa.me/5547999990000?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });
});

describe("montarMensagem", () => {
  it("cita o número do pedido e os produtos", () => {
    const mensagem = montarMensagem(ticketBase);
    expect(mensagem).toContain(numeroTicket(ticketBase.id));
    expect(mensagem).toContain("2x Ultraled S14 H4");
  });
});
