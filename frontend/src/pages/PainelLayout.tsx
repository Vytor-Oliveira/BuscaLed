import * as RadixDialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import {
  ExternalLink,
  Lightbulb,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { listTickets } from "../api/tickets";
import { useAuth } from "../auth/AuthContext";
import { MenuUsuario } from "../components/site/MenuUsuario";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { cn } from "../lib/cn";
import { menuDoPapel, ROTULO_PAPEL, tituloDaRota, type ItemDeMenu } from "../features/painel/navegacao";

function Marca({ compacto }: { compacto: boolean }) {
  return (
    <span className="flex items-center gap-2.5 overflow-hidden">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-accent-400"
      >
        <Lightbulb className="size-4.5" />
      </span>
      {!compacto && (
        <span className="truncate text-[16px] font-bold tracking-[-0.02em] text-sidebar-ink">
          Busca<span className="text-accent-400">LED</span>
        </span>
      )}
    </span>
  );
}

function Navegacao({
  itens,
  pendentes,
  compacto,
  onNavegar,
}: {
  itens: ItemDeMenu[];
  pendentes: number;
  compacto: boolean;
  onNavegar?: () => void;
}) {
  return (
    <nav aria-label="Seções do painel" className="flex flex-col gap-1">
      {itens.map(({ para, rotulo, Icone, contaPendentes }) => (
        <NavLink
          key={para}
          to={para}
          onClick={onNavegar}
          title={compacto ? rotulo : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[14px] font-medium",
              "transition-colors duration-[var(--dur-fast)]",
              compacto && "justify-center px-0",
              isActive
                ? "bg-white/14 text-white"
                : "text-sidebar-muted hover:bg-white/10 hover:text-white"
            )
          }
        >
          <Icone aria-hidden className="size-4.5 shrink-0" />
          {!compacto && <span className="flex-1 truncate">{rotulo}</span>}
          {contaPendentes && pendentes > 0 && (
            <span
              data-numeros
              aria-label={`${pendentes} pedidos novos`}
              className={cn(
                "rounded-full bg-accent-500 px-1.5 py-px text-[11px] font-bold leading-[1.45] text-accent-ink",
                compacto && "absolute right-2 top-1.5"
              )}
            >
              {pendentes}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function PainelLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [compacto, setCompacto] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // O termo vive na URL: a fila lê de lá, e o link fica compartilhável.
  const [params, setParams] = useSearchParams();
  const termo = params.get("q") ?? "";

  // Contador do menu: o representante precisa ver que entrou pedido novo sem
  // abrir a fila.
  const pendentes = useQuery({
    queryKey: ["tickets", "PENDENTE"],
    queryFn: () => listTickets("PENDENTE").then((r) => r.tickets.length),
    refetchInterval: 60_000,
  });

  const itens = user ? menuDoPapel(user.role) : [];
  const titulo = tituloDaRota(location.pathname);
  const naFila = location.pathname.startsWith("/painel/tickets");

  const interiorDaSidebar = (compactado: boolean, onNavegar?: () => void) => (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className={cn("flex items-center justify-between gap-2 px-1 pt-1", compactado && "justify-center")}>
        <Link to="/painel" aria-label="Painel do BuscaLED">
          <Marca compacto={compactado} />
        </Link>
      </div>

      <Navegacao itens={itens} pendentes={pendentes.data ?? 0} compacto={compactado} onNavegar={onNavegar} />

      <div className="mt-auto flex flex-col gap-3">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13.5px]",
            "text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white",
            compactado && "justify-center px-0"
          )}
          title={compactado ? "Ver o site" : undefined}
        >
          <ExternalLink aria-hidden className="size-4 shrink-0" />
          {!compactado && "Ver o site"}
        </Link>

        {!compactado && user && (
          <div className="rounded-[var(--radius-sm)] bg-white/8 px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
            <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {ROTULO_PAPEL[user.role]}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sidebar do desktop, recolhível para só ícones. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden bg-brand-800 transition-[width] duration-[var(--dur)]",
          "ease-(--ease-out-expo) lg:block",
          compacto ? "w-[4.5rem]" : "w-64"
        )}
      >
        {interiorDaSidebar(compacto)}
      </aside>

      {/* Gaveta do celular: Radix cuida de foco, Esc e scroll do fundo. */}
      <RadixDialog.Root open={gavetaAberta} onOpenChange={setGavetaAberta}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-40 bg-[#0a121b]/55 lg:hidden" />
          <RadixDialog.Content
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-brand-800 shadow-xl lg:hidden",
              "data-[state=open]:animate-[assenta_var(--dur)_var(--ease)]"
            )}
          >
            <RadixDialog.Title className="sr-only">Menu do painel</RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Fechar menu"
              className="absolute right-3 top-3.5 rounded-[var(--radius-xs)] p-1.5 text-sidebar-muted hover:bg-white/10"
            >
              <X aria-hidden className="size-4.5" />
            </RadixDialog.Close>
            {interiorDaSidebar(false, () => setGavetaAberta(false))}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <div
        className={cn(
          "transition-[padding] duration-[var(--dur)] ease-(--ease-out-expo)",
          compacto ? "lg:pl-[4.5rem]" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-10 border-b border-line bg-surface/92 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <button
              type="button"
              onClick={() => setGavetaAberta(true)}
              aria-label="Abrir menu"
              className="rounded-[var(--radius-sm)] p-2 text-muted hover:bg-sunken hover:text-ink lg:hidden"
            >
              <Menu aria-hidden className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setCompacto((v) => !v)}
              aria-label={compacto ? "Expandir menu" : "Recolher menu"}
              className="hidden rounded-[var(--radius-sm)] p-2 text-muted hover:bg-sunken hover:text-ink lg:block"
            >
              {compacto ? (
                <PanelLeftOpen aria-hidden className="size-5" />
              ) : (
                <PanelLeftClose aria-hidden className="size-5" />
              )}
            </button>

            <h1 className="truncate text-[17px] font-bold tracking-[-0.015em] text-ink">
              {titulo}
            </h1>

            {/* Busca global da fila: só faz sentido na fila, então só aparece lá. */}
            {naFila && (
              <div className="relative ml-auto hidden max-w-xs flex-1 items-center sm:flex">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 size-4 text-subtle"
                />
                <input
                  value={termo}
                  onChange={(e) => {
                    const proximos = new URLSearchParams(params);
                    if (e.target.value) {
                      proximos.set("q", e.target.value);
                    } else {
                      proximos.delete("q");
                    }
                    setParams(proximos, { replace: true });
                  }}
                  type="search"
                  aria-label="Buscar pedido por número, e-mail, telefone ou produto"
                  placeholder="Buscar pedido…"
                  className={cn(
                    "h-10 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface",
                    "pl-9 pr-3 text-[13.5px] text-ink placeholder:text-subtle"
                  )}
                />
              </div>
            )}

            <div className={cn("flex items-center gap-2.5", !naFila && "ml-auto")}>
              <ThemeToggle />
              <MenuUsuario />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
