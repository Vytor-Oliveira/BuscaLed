import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LayoutDashboard, LogOut, Package, User, Warehouse } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { iniciais } from "../../lib/formato";
import { cn } from "../../lib/cn";

const ROTULO_PAPEL = {
  admin: "Administrador",
  rep: "Representante",
  user: "Cliente",
} as const;

const ITEM =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-xs)] px-2.5 py-2 " +
  "text-[13.5px] text-ink outline-none data-[highlighted]:bg-sunken";

export function MenuUsuario() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link
        to="/entrar"
        className={cn(
          "inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong",
          "bg-surface px-3.5 text-[13px] font-semibold text-ink shadow-sm",
          "transition-colors duration-[var(--dur-fast)] hover:bg-sunken"
        )}
      >
        Entrar
      </Link>
    );
  }

  const ehPainel = user.role === "rep" || user.role === "admin";

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5",
            "transition-colors duration-[var(--dur-fast)] hover:border-line-strong"
          )}
        >
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-on-brand dark:text-[#07111c]"
          >
            {iniciais(user.name)}
          </span>
          <span className="hidden max-w-28 truncate text-[13px] font-semibold text-ink sm:block">
            {user.name.split(" ")[0]}
          </span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-subtle" />
          <span className="sr-only">Abrir menu da conta</span>
        </button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-60 rounded-[var(--radius-md)] border border-line bg-raised p-1.5 shadow-lg",
            "data-[state=open]:assenta"
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[12.5px] text-muted">{user.email}</p>
            <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-wider text-subtle">
              {ROTULO_PAPEL[user.role]}
            </p>
          </div>
          <Dropdown.Separator className="my-1 h-px bg-line" />

          {ehPainel && (
            <Dropdown.Item className={ITEM} onSelect={() => navigate("/painel")}>
              <LayoutDashboard aria-hidden className="size-4 text-subtle" />
              Painel
            </Dropdown.Item>
          )}
          <Dropdown.Item className={ITEM} onSelect={() => navigate("/garagem")}>
            <Warehouse aria-hidden className="size-4 text-subtle" />
            Minha garagem
          </Dropdown.Item>
          <Dropdown.Item className={ITEM} onSelect={() => navigate("/pedidos")}>
            <Package aria-hidden className="size-4 text-subtle" />
            Meus pedidos
          </Dropdown.Item>
          <Dropdown.Item className={ITEM} onSelect={() => navigate("/conta")}>
            <User aria-hidden className="size-4 text-subtle" />
            Minha conta
          </Dropdown.Item>

          <Dropdown.Separator className="my-1 h-px bg-line" />
          <Dropdown.Item
            className={cn(ITEM, "text-danger")}
            onSelect={() => {
              void logout().then(() => navigate("/"));
            }}
          >
            <LogOut aria-hidden className="size-4" />
            Sair
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
