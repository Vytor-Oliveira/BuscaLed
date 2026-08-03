/**
 * Exemplo de configuração Vitest para o frontend (React + Vite).
 * Renomeie para vitest.config.ts na raiz de /frontend quando iniciar o módulo.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 25, // meta RNF05 do RFC — frontend
      },
    },
  },
});
