/**
 * Exemplo de configuração Jest para o backend.
 * Renomeie para jest.config.js na raiz de /backend quando iniciar o módulo.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      lines: 75, // meta RNF05 do RFC — backend
    },
  },
};
