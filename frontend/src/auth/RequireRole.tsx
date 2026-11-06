import { Navigate, useLocation } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { UserRole, useAuth } from "./AuthContext";
import { CarregandoSessao } from "../components/ui/CarregandoSessao";

const NOME_PAPEL: Record<UserRole, string> = {
  admin: "ao administrador",
  rep: "ao representante",
  user: "ao cliente",
};

// A mensagem sai dos papéis que a rota aceita. Fixa, ela dizia que a área era
// do representante também em /painel/estoque, que é só do admin — ou seja,
// contradizia o bloqueio que estava explicando.
function quemPode(roles: UserRole[]): string {
  const nomes = roles.map((papel) => NOME_PAPEL[papel]);
  if (nomes.length === 1) {
    return nomes[0];
  }
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * Guarda de rota. Enquanto a sessão carrega não decide nada — redirecionar
 * antes da resposta do /auth/me jogaria quem está logado para o login a cada
 * recarregamento da página.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <CarregandoSessao />;
  }

  if (!user) {
    // Guarda a origem para o login devolver o visitante onde ele estava: sem
    // isso, quem clica em "Gerar reserva" deslogado perde a seleção.
    return <Navigate to="/entrar" replace state={{ de: location.pathname + location.search }} />;
  }

  if (!roles.includes(user.role)) {
    return (
      <section className="container-app grid min-h-[60vh] place-items-center py-16">
        <div className="flex max-w-md flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-danger-bg text-danger">
            <ShieldOff aria-hidden className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">Sem permissão</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Esta área é restrita {quemPode(roles)}.
          </p>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
