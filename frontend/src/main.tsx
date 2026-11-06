import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "./app/providers";
import { Rotas } from "./app/router";
import { LimiteDeErro } from "./app/LimiteDeErro";
import "./styles/app.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Elemento #root não encontrado em index.html.");
}

createRoot(container).render(
  <StrictMode>
    <LimiteDeErro>
      <Providers>
        <Rotas />
      </Providers>
    </LimiteDeErro>
  </StrictMode>
);
