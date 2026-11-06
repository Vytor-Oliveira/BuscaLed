import { Navigate } from "react-router-dom";
import { UserRole, useAuth } from "./AuthContext";

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

  if (loading) {
    return <p className="estado-carregando">Carregando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <section className="estado-vazio">
        <h2>Sem permissão</h2>
        <p>Esta área é restrita {quemPode(roles)}.</p>
      </section>
    );
  }

  return <>{children}</>;
}
