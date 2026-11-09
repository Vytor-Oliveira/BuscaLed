import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarImagemProduto } from "./catalog";
import { ApiError } from "./client";

const fetchOriginal = globalThis.fetch;

function respondeCom(corpo: unknown, status = 200): { urls: string[] } {
  const urls: string[] = [];
  globalThis.fetch = ((url: URL) => {
    urls.push(String(url));
    return Promise.resolve(
      new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as unknown as typeof fetch;
  return { urls };
}

const imagem = () => new File(["conteudo"], "farol.png", { type: "image/png" });

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  vi.unstubAllEnvs();
});

describe("enviarImagemProduto", () => {
  it("envia para a mesma origem quando VITE_API_URL vem vazia", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { urls } = respondeCom({ imageUrl: "/uploads/farol.png" });

    const endereco = await enviarImagemProduto(imagem());

    expect(urls).toEqual([`${window.location.origin}/catalog/uploads/imagem`]);
    expect(endereco).toBe("/uploads/farol.png");
  });

  it("propaga o erro que o servidor devolveu", async () => {
    vi.stubEnv("VITE_API_URL", "");
    respondeCom({ error: "Arquivo grande demais." }, 413);

    await expect(enviarImagemProduto(imagem())).rejects.toThrow(
      new ApiError(413, "Arquivo grande demais.")
    );
  });

  it("recusa resposta sem o endereço da imagem", async () => {
    vi.stubEnv("VITE_API_URL", "");
    respondeCom({});

    await expect(enviarImagemProduto(imagem())).rejects.toThrow(
      "O servidor não devolveu o endereço da imagem."
    );
  });
});
