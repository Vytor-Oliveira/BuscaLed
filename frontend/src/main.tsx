import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import Confirmacao from "./pages/Confirmacao";
import Dashboard from "./pages/Dashboard";
import Garagem from "./pages/Garagem";
import Login from "./pages/Login";
import MeusPedidos from "./pages/MeusPedidos";
import PainelLayout from "./pages/PainelLayout";
import RedefinirSenha from "./pages/RedefinirSenha";
import Stock from "./pages/Stock";
import TicketQueue from "./pages/TicketQueue";
import Vitrine from "./pages/Vitrine";
import "./styles.css";
import "./styles-site.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Elemento #root não encontrado em index.html.");
}

const TODOS = ["user", "rep", "admin"] as const;

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Fluxo 2 da RFC — o caminho do cliente. A vitrine é pública:
              buscar compatibilidade não exige conta, só reservar exige. */}
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/resultado" element={<Vitrine />} />
          <Route
            path="/garagem"
            element={
              <RequireRole roles={[...TODOS]}>
                <Garagem />
              </RequireRole>
            }
          />
          <Route
            path="/confirmar"
            element={
              <RequireRole roles={[...TODOS]}>
                <Confirmacao />
              </RequireRole>
            }
          />
          <Route
            path="/pedidos"
            element={
              <RequireRole roles={[...TODOS]}>
                <MeusPedidos />
              </RequireRole>
            }
          />

          <Route
            path="/painel"
            element={
              <RequireRole roles={["rep", "admin"]}>
                <PainelLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="/painel/tickets" replace />} />
            <Route path="tickets" element={<TicketQueue />} />
            <Route path="demanda" element={<Dashboard />} />
            {/* RN06: estoque e catalogo sao exclusivos do admin — o backend
                tambem responde 403 pro representante nessas rotas. */}
            <Route
              path="estoque"
              element={
                <RequireRole roles={["admin"]}>
                  <Stock />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
