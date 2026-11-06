import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "../auth/AuthContext";
import { ThemeProvider } from "../app/theme";
import { ToastProvider } from "../components/ui/Toast";
import { TooltipProvider } from "../components/ui/Tooltip";
import { CarrinhoProvider } from "../features/reserva/CarrinhoContext";

/**
 * Em teste, retry e cache atrapalham: um 4xx esperado viraria três tentativas,
 * e estado vazado entre casos esconde bug.
 */
export function criarClienteDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface Opcoes {
  rota?: string;
  cliente?: QueryClient;
  /** Semeia o carrinho da reserva, que mora em sessionStorage. */
  carrinho?: unknown;
}

export function renderizarComProvedores(
  elemento: ReactNode,
  { rota = "/", cliente = criarClienteDeTeste(), carrinho }: Opcoes = {}
): RenderResult {
  // O carrinho vive em sessionStorage: sem limpar, a seleção de um teste
  // apareceria no seguinte.
  try {
    sessionStorage.clear();
    localStorage.clear();
    if (carrinho) {
      sessionStorage.setItem("buscaled:reserva", JSON.stringify(carrinho));
    }
  } catch {
    // Storage bloqueado no ambiente de teste: nada a limpar.
  }

  return render(
    <QueryClientProvider client={cliente}>
      <ThemeProvider>
        <TooltipProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[rota]}>
              <AuthProvider>
                <CarrinhoProvider>{elemento}</CarrinhoProvider>
              </AuthProvider>
            </MemoryRouter>
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

interface RespostaFalsa {
  ok: boolean;
  status: number;
  corpo: unknown;
}

/**
 * Substitui o fetch global roteando por caminho. Devolve a lista de chamadas
 * para o teste conferir o que a tela pediu.
 */
export function mockarApi(
  resolver: (caminho: string, init?: RequestInit) => RespostaFalsa
): string[] {
  const chamadas: string[] = [];
  globalThis.fetch = ((url: string | URL, init?: RequestInit) => {
    const endereco = new URL(String(url), "http://localhost");
    const caminho = endereco.pathname;
    chamadas.push(`${init?.method ?? "GET"} ${caminho}${endereco.search}`);
    const resposta = resolver(caminho, init);
    return Promise.resolve({
      ok: resposta.ok,
      status: resposta.status,
      json: () => Promise.resolve(resposta.corpo),
    });
  }) as unknown as typeof fetch;
  return chamadas;
}

export const SEM_SESSAO: RespostaFalsa = {
  ok: false,
  status: 401,
  corpo: { error: "Não autenticado." },
};

export function sessaoDe(role: "user" | "rep" | "admin"): RespostaFalsa {
  return {
    ok: true,
    status: 200,
    corpo: { user: { id: "u-1", name: "Teste Silva", email: "t@example.com", role } },
  };
}
