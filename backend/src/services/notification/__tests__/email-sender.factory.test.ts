import { ConsoleEmailSender } from "../console-email-sender";
import { createEmailSender } from "../email-sender.factory";
import { NodemailerEmailSender } from "../nodemailer-email-sender";
import { ResendEmailSender } from "../resend-email-sender";

const original = { ...process.env };

function comAmbiente(vars: Record<string, string | undefined>): void {
  for (const chave of ["NODE_ENV", "RESEND_API_KEY", "RESEND_FROM", "GMAIL_USER", "GMAIL_APP_PASSWORD"]) {
    delete process.env[chave];
  }
  Object.assign(process.env, vars);
}

afterEach(() => {
  process.env = { ...original };
});

describe("createEmailSender", () => {
  // A suite cadastra dezenas de usuarios. Com provedor real, cada um virava um
  // envio de verdade — recusado por limite de taxa e por dominio de exemplo —
  // e as retentativas do Bull seguravam o encerramento da fila.
  it("usa o console em teste mesmo com Resend configurado", () => {
    comAmbiente({ NODE_ENV: "test", RESEND_API_KEY: "chave", RESEND_FROM: "a@b.com" });

    expect(createEmailSender()).toBeInstanceOf(ConsoleEmailSender);
  });

  it("usa o console em teste mesmo com Gmail configurado", () => {
    comAmbiente({ NODE_ENV: "test", GMAIL_USER: "a@b.com", GMAIL_APP_PASSWORD: "senha" });

    expect(createEmailSender()).toBeInstanceOf(ConsoleEmailSender);
  });

  it("prefere o Resend fora de teste", () => {
    comAmbiente({ NODE_ENV: "production", RESEND_API_KEY: "chave", RESEND_FROM: "a@b.com" });

    expect(createEmailSender()).toBeInstanceOf(ResendEmailSender);
  });

  it("cai no Gmail quando o Resend nao esta completo", () => {
    comAmbiente({
      NODE_ENV: "production",
      RESEND_API_KEY: "chave",
      GMAIL_USER: "a@b.com",
      GMAIL_APP_PASSWORD: "senha",
    });

    expect(createEmailSender()).toBeInstanceOf(NodemailerEmailSender);
  });

  it("avisa alto e usa o console quando nao ha provedor nenhum", () => {
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    comAmbiente({ NODE_ENV: "production" });

    expect(createEmailSender()).toBeInstanceOf(ConsoleEmailSender);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("Nenhum provedor configurado"));
    aviso.mockRestore();
  });
});
