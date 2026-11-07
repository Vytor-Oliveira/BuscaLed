import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { ToastProvider } from "../components/ui/Toast";
import { TooltipProvider } from "../components/ui/Tooltip";
import { ThemeProvider } from "./theme";
import { CarrinhoProvider } from "../features/reserva/CarrinhoContext";

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 401 e 403 são respostas, não falhas de rede: repetir não muda nada e
      // atrasa a tela de login.
      retry: (tentativas, erro) => {
        if (erro instanceof ApiError && erro.status >= 400 && erro.status < 500) {
          return false;
        }
        return tentativas < 2;
      },
    },
    mutations: { retry: false },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={cliente}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200} skipDelayDuration={400}>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <CarrinhoProvider>{children}</CarrinhoProvider>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
