import { NodemailerEmailSender } from "../nodemailer-email-sender";

// Não há envio real aqui: o nodemailer só abre conexão no sendMail, então
// construir o sender e bater no guard do APP_BASE_URL não toca a rede.
describe("NodemailerEmailSender", () => {
  const originalBaseUrl = process.env.APP_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalBaseUrl;
    }
  });

  it("recusa montar o link de confirmação sem APP_BASE_URL", async () => {
    delete process.env.APP_BASE_URL;
    const sender = new NodemailerEmailSender("remetente@example.com", "senha-de-app");

    await expect(sender.sendConfirmationEmail("cliente@example.com", "token-123")).rejects.toThrow(
      "APP_BASE_URL não configurado"
    );
  });
});
