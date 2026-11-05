import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  IconeCaixa,
  IconeDashboard,
  IconeFila,
  IconeLampada,
  IconeSeta,
} from "../components/Icones";

export default function PainelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function sair() {
    await logout();
    navigate("/login", { replace: true });
  }

  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? "ativo" : undefined);

  return (
    <div className="painel">
      <nav className="sidebar" aria-label="Painel gerencial">
        <div className="sidebar-marca">
          <span className="sidebar-marca-icone">
            <IconeLampada tamanho={17} />
          </span>
          <span>
            <span className="sidebar-marca-nome">
              Busca<span>LED</span>
            </span>
            <div className="sidebar-marca-sub">ADMIN</div>
          </span>
        </div>

        <div className="sidebar-nav">
          <NavLink to="/painel/demanda" className={classe}>
            <IconeDashboard tamanho={15} />
            Dashboard
          </NavLink>
          <NavLink to="/painel/tickets" className={classe}>
            <IconeFila tamanho={15} />
            Fila de Pedidos
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/painel/estoque" className={classe}>
              <IconeCaixa tamanho={15} />
              Catálogo
            </NavLink>
          )}
        </div>

        <div className="sidebar-rodape">
          <a href="/">
            <IconeSeta tamanho={15} />
            Site
          </a>
          <button type="button" onClick={sair}>
            Sair ({user?.name})
          </button>
        </div>
      </nav>

      <main className="painel-conteudo">
        <Outlet />
      </main>
    </div>
  );
}
