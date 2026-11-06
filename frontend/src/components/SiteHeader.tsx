import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { IconeLampada } from "./Icones";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function sair() {
    await logout();
    navigate("/", { replace: true });
  }

  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? "ativo" : undefined);

  return (
    <header className="site-topo">
      <NavLink to="/" className="site-marca">
        <span className="site-marca-icone">
          <IconeLampada tamanho={17} />
        </span>
        <span className="site-marca-nome">
          Busca<span>LED</span>
        </span>
      </NavLink>

      <nav className="site-nav" aria-label="Principal">
        <NavLink to="/" className={classe} end>
          Buscar
        </NavLink>
        {user && (
          <>
            <NavLink to="/garagem" className={classe}>
              Garagem
            </NavLink>
            <NavLink to="/pedidos" className={classe}>
              Meus Pedidos
            </NavLink>
          </>
        )}
      </nav>

      <div className="site-usuario">
        {user ? (
          <>
            <span className="site-avatar" aria-hidden="true">
              {iniciais(user.name)}
            </span>
            <span className="site-nome">{user.name}</span>
            <button type="button" className="botao-secundario" onClick={sair}>
              Sair
            </button>
          </>
        ) : (
          <NavLink to="/login" className="botao-primario">
            Entrar
          </NavLink>
        )}
      </div>
    </header>
  );
}
