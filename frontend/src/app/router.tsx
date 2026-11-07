import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "../auth/RequireRole";
import { CarregandoSessao } from "../components/ui/CarregandoSessao";

const Landing = lazy(() => import("../pages/Landing"));
const Resultado = lazy(() => import("../pages/Resultado"));
const Reserva = lazy(() => import("../pages/Reserva"));
const Entrar = lazy(() => import("../pages/Entrar"));
const RedefinirSenha = lazy(() => import("../pages/RedefinirSenha"));
const NaoEncontrada = lazy(() => import("../pages/NaoEncontrada"));
const Conta = lazy(() => import("../pages/Conta"));
const Garagem = lazy(() => import("../pages/Garagem"));
const MeusPedidos = lazy(() => import("../pages/MeusPedidos"));

const PainelLayout = lazy(() => import("../pages/PainelLayout"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const TicketQueue = lazy(() => import("../pages/TicketQueue"));
const Stock = lazy(() => import("../pages/Stock"));

const TODOS = ["user", "rep", "admin"] as const;

export function Rotas() {
  return (
    <Suspense fallback={<CarregandoSessao />}>
      <Routes>
        {/* Público: buscar compatibilidade não exige conta. Só reservar exige. */}
        <Route path="/" element={<Landing />} />
        <Route path="/resultado" element={<Resultado />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/login" element={<Navigate to="/entrar" replace />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route
          path="/reserva"
          element={
            <RequireRole roles={[...TODOS]}>
              <Reserva />
            </RequireRole>
          }
        />
        <Route
          path="/garagem"
          element={
            <RequireRole roles={[...TODOS]}>
              <Garagem />
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
          path="/conta"
          element={
            <RequireRole roles={[...TODOS]}>
              <Conta />
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
          {/* O detalhe é um painel lateral sobre a fila, então é a mesma tela. */}
          <Route path="tickets/:id" element={<TicketQueue />} />
          <Route path="demanda" element={<Dashboard />} />
          {/* RN06: estoque e catálogo são exclusivos do admin — o backend
              também responde 403 pro representante nessas rotas. */}
          <Route
            path="estoque"
            element={
              <RequireRole roles={["admin"]}>
                <Stock />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </Suspense>
  );
}
