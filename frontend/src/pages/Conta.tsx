import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Shield, User } from "lucide-react";
import { useAuth, type UserRole } from "../auth/AuthContext";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { Button } from "../components/ui/Button";
import { iniciais } from "../lib/formato";

const ROTULO_PAPEL: Record<UserRole, string> = {
  admin: "Administrador",
  rep: "Representante",
  user: "Cliente",
};

const EXPLICACAO_PAPEL: Record<UserRole, string> = {
  admin: "Mantém o catálogo, o estoque e a matriz de compatibilidade.",
  rep: "Atende a fila de pedidos e fala com os clientes.",
  user: "Busca compatibilidade, salva veículos e gera reservas.",
};

export default function Conta() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <>
      <SiteHeader />

      <main className="container-app py-8 lg:py-10">
        <h1 className="text-[clamp(1.5rem,3.8vw,2.1rem)] font-bold tracking-[-0.03em] text-ink">
          Minha conta
        </h1>

        <div className="mt-6 max-w-lg rounded-[var(--radius-md)] border border-line bg-surface">
          <div className="flex items-center gap-4 border-b border-line p-5">
            <span
              aria-hidden
              className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 text-[18px] font-bold text-on-brand dark:text-[#07111c]"
            >
              {iniciais(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold tracking-[-0.015em] text-ink">
                {user.name}
              </p>
              <p className="truncate text-[13.5px] text-muted">{user.email}</p>
            </div>
          </div>

          <dl className="divide-y divide-line">
            <div className="flex gap-3 px-5 py-4">
              <User aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
              <div className="min-w-0">
                <dt className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
                  Nome
                </dt>
                <dd className="mt-0.5 text-[14px] text-ink">{user.name}</dd>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4">
              <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
              <div className="min-w-0">
                <dt className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
                  E-mail
                </dt>
                <dd className="mt-0.5 break-words text-[14px] text-ink">{user.email}</dd>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4">
              <Shield aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
              <div className="min-w-0">
                <dt className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
                  Perfil
                </dt>
                <dd className="mt-0.5 text-[14px] text-ink">{ROTULO_PAPEL[user.role]}</dd>
                <dd className="mt-0.5 text-[13px] leading-snug text-muted">
                  {EXPLICACAO_PAPEL[user.role]}
                </dd>
              </div>
            </div>
          </dl>

        </div>

        <Button
          variante="secundario"
          Icone={LogOut}
          className="mt-5"
          onClick={() => {
            void logout().then(() => navigate("/"));
          }}
        >
          Sair da conta
        </Button>
      </main>

      <SiteFooter />
    </>
  );
}
