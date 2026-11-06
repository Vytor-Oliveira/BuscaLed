import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Worktree de experimento: o backend dele roda na 3001, com banco proprio, para
// a migration de preco nao tocar o banco de dev nem o backend da 3000. O proxy
// deixa as chamadas same-origin, entao o CORS de origem unica sai da jogada e os
// dois frontends rodam ao mesmo tempo.
const ALVO_DA_API = "http://localhost:3001";

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
    port: 5174,
    // Sem strictPort o vite cai para outra porta e o VITE_API_URL aponta errado.
    strictPort: true,
    proxy: Object.fromEntries(
      PREFIXOS_DA_API.map((prefixo) => [padraoDoPrefixo(prefixo), ALVO_DA_API])
    ),
  },
});
