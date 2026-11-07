import { Link, NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";
import { Marca } from "./Marca";
import { MenuUsuario } from "./MenuUsuario";
import { ThemeToggle } from "../ui/ThemeToggle";

const LINKS = [
  { para: "/#como-funciona", rotulo: "Como funciona" },
  { para: "/#posicoes", rotulo: "Posições atendidas" },
  { para: "/#duvidas", rotulo: "Dúvidas" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/92 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="BuscaLED, página inicial" className="shrink-0">
          <Marca />
        </Link>

        <nav aria-label="Seções do site" className="hidden items-center gap-1 lg:flex">
          {LINKS.map(({ para, rotulo }) => (
            <a
              key={para}
              href={para}
              className={cn(
                "rounded-[var(--radius-xs)] px-3 py-2 text-[13.5px] font-medium text-muted",
                "transition-colors duration-[var(--dur-fast)] hover:text-ink"
              )}
            >
              {rotulo}
            </a>
          ))}
          <NavLink
            to="/garagem"
            className={({ isActive }) =>
              cn(
                "rounded-[var(--radius-xs)] px-3 py-2 text-[13.5px] font-medium",
                "transition-colors duration-[var(--dur-fast)] hover:text-ink",
                isActive ? "text-ink" : "text-muted"
              )
            }
          >
            Minha garagem
          </NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <ThemeToggle />
          <MenuUsuario />
        </div>
      </div>
    </header>
  );
}
