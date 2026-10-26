import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import Login from "./pages/Login";
import PainelLayout from "./pages/PainelLayout";
import Stock from "./pages/Stock";
import TicketQueue from "./pages/TicketQueue";
import Dashboard from "./pages/Dashboard";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Elemento #root não encontrado em index.html.");
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
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
