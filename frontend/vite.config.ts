import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// O proxy existe para quem quiser rodar same-origin: apontando VITE_API_URL
// para o proprio servidor de dev, as chamadas saem sem CORS. Os valores sao os
// do projeto (backend 3000, FRONTEND_URL 5173) e so mudam por variavel de
// ambiente — porta de maquina nao entra no arquivo versionado.
const ALVO_DA_API = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000";
const PORTA = Number(process.env.VITE_PORT ?? 5173);

const PREFIXOS_DA_API = [
  "/health",
  "/compatibility",
  "/plate",
  "/auth",
  "/garage",
  "/stock",
  "/catalog",
  "/analytics",
  "/tickets",
  "/uploads",
];

/**
 * Chave de proxy do vite casa por prefixo solto, entao "/garage" engolia a rota
 * "/garagem" do proprio app. A ancora resolve isso — mas o vite testa a regex
 * contra `req.url`, que **inclui a query string**, entao o "?" precisa entrar
 * nos terminadores aceitos: sem ele, "/compatibility?make=..." deixa de ser
 * proxiado e o vite devolve o index.html no lugar do JSON.
 */
function padraoDoPrefixo(prefixo: string): string {
  return `^${prefixo}(/|\\?|$)`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORTA,
    // Sem strictPort o vite cai para outra porta, e aí o CORS do backend
    // (que libera o FRONTEND_URL) passa a recusar os cookies de sessão.
    strictPort: true,
    proxy: Object.fromEntries(
      PREFIXOS_DA_API.map((prefixo) => [padraoDoPrefixo(prefixo), ALVO_DA_API])
    ),
  },
});
