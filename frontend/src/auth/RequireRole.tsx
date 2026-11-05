import { Navigate } from "react-router-dom";
import { UserRole, useAuth } from "./AuthContext";

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
        <p>Esta área é restrita ao representante e ao administrador.</p>
      </section>
    );
  }

  return <>{children}</>;
}
