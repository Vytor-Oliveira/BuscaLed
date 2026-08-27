module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      // Meta do RNF05 (75%, prevista só pro M6) já atingida no M2 graças
      // aos testes de integração reais (auth + garagem), bem antes do
      // previsto no roteiro.
      lines: 75,
    },
  },
};
