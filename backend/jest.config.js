module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      // Meta final do RNF05 e 75% (M6, ver docs/roteiro-tecnico.md). Piso
      // temporario mais baixo durante M1-M5 para nao bloquear o pipeline
      // antes da fase de testes/qualidade — subir gradualmente ate M6.
      lines: 35,
    },
  },
};
