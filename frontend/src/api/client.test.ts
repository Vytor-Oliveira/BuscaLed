import { afterEach, describe, expect, it, vi } from "vitest";
import { api, baseDaApi } from "./client";

const fetchOriginal = globalThis.fetch;

function capturaChamadas(): string[] {
  const urls: string[] = [];
  globalThis.fetch = ((url: string) => {
    urls.push(String(url));
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as unknown as typeof fetch;
  return urls;
}

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  vi.unstubAllEnvs();
});

describe("baseDaApi", () => {
  it("usa a origem da página quando VITE_API_URL vem vazia", () => {
    vi.stubEnv("VITE_API_URL", "");
    expect(baseDaApi()).toBe(window.location.origin);
  });

  it("usa o endereço configurado quando ele existe", () => {
    vi.stubEnv("VITE_API_URL", "https://api.exemplo.test");
    expect(baseDaApi()).toBe("https://api.exemplo.test");
  });
});

describe("api", () => {
  it("chama a mesma origem quando VITE_API_URL vem vazia", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const urls = capturaChamadas();

    await api("/auth/me");

    expect(urls).toEqual([`${window.location.origin}/auth/me`]);
  });

  it("chama o endereço configurado quando ele existe", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.exemplo.test");
    const urls = capturaChamadas();

    await api("/auth/me");

    expect(urls).toEqual(["https://api.exemplo.test/auth/me"]);
  });

  it("monta a query string ignorando valores vazios", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const urls = capturaChamadas();

    await api("/tickets", { query: { status: "PENDENTE", busca: "" } });

    expect(urls).toEqual([`${window.location.origin}/tickets?status=PENDENTE`]);
  });
});
