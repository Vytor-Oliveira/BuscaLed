import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";

interface Props {
  rotulo: string;
  valor: string;
  opcoes: string[];
  onEscolher: (valor: string) => void;
  placeholder?: string;
  /** Mensagem quando a lista chegou vazia (marca sem modelo cadastrado). */
  vazio?: string;
  carregando?: boolean;
  desabilitado?: boolean;
  erro?: string;
  dica?: string;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Combobox de seleção única sobre lista conhecida. Implementa o padrão ARIA
 * combobox com listbox: role, aria-expanded, aria-activedescendant e navegação
 * por setas, Home/End, Enter e Esc.
 */
export function Combobox({
  rotulo,
  valor,
  opcoes,
  onEscolher,
  placeholder = "Comece a digitar…",
  vazio = "Nada encontrado.",
  carregando = false,
  desabilitado = false,
  erro,
  dica,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const idBase = useId();
  const refCampo = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(() => {
    const alvo = normalizar(busca.trim());
    if (!alvo) {
      return opcoes;
    }
    const comeca: string[] = [];
    const contem: string[] = [];
    for (const opcao of opcoes) {
      const n = normalizar(opcao);
      if (n.startsWith(alvo)) {
        comeca.push(opcao);
      } else if (n.includes(alvo)) {
        contem.push(opcao);
      }
    }
    return [...comeca, ...contem];
  }, [opcoes, busca]);

  function abrir() {
    setAberto(true);
    setBusca("");
    setAtivo(Math.max(0, filtradas.indexOf(valor)));
  }

  function escolher(opcao: string) {
    onEscolher(opcao);
    setAberto(false);
    setBusca("");
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAtivo((i) => Math.min(filtradas.length - 1, i + 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      setAtivo(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      setAtivo(filtradas.length - 1);
    } else if (evento.key === "Enter" && filtradas[ativo]) {
      evento.preventDefault();
      escolher(filtradas[ativo]);
    }
  }

  const descricao = erro ? `${idBase}-erro` : dica ? `${idBase}-dica` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${idBase}-gatilho`} className="text-[13px] font-semibold text-ink">
        {rotulo}
      </label>

      <Popover.Root
        open={aberto}
        onOpenChange={(v) => (v ? abrir() : setAberto(false))}
      >
        <Popover.Trigger asChild>
          <button
            id={`${idBase}-gatilho`}
            type="button"
            role="combobox"
            aria-expanded={aberto}
            aria-haspopup="listbox"
            aria-invalid={erro ? true : undefined}
            aria-describedby={descricao}
            disabled={desabilitado || carregando}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)]",
              "border bg-surface px-3.5 text-left text-ink",
              "transition-[border-color] duration-[var(--dur-fast)]",
              "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-subtle",
              erro ? "border-danger" : "border-line-strong hover:border-[color-mix(in_oklab,var(--border-strong),var(--text)_22%)]"
            )}
          >
            <span className={cn("truncate", !valor && "text-subtle")}>
              {carregando ? "Carregando…" : valor || placeholder}
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0 text-subtle" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden",
              "rounded-[var(--radius-md)] border border-line bg-raised shadow-lg",
              "data-[state=open]:assenta"
            )}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              refCampo.current?.focus();
            }}
          >
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search aria-hidden className="size-4 shrink-0 text-subtle" />
              <input
                ref={refCampo}
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setAtivo(0);
                }}
                onKeyDown={aoTeclar}
                aria-label={`Filtrar ${rotulo.toLowerCase()}`}
                aria-controls={`${idBase}-lista`}
                aria-activedescendant={
                  filtradas[ativo] ? `${idBase}-opcao-${ativo}` : undefined
                }
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
                placeholder="Filtrar…"
              />
            </div>

            <ul
              id={`${idBase}-lista`}
              role="listbox"
              aria-label={rotulo}
              className="max-h-64 overflow-y-auto p-1"
            >
              {filtradas.length === 0 && (
                <li className="px-2.5 py-3 text-[13.5px] text-muted">{vazio}</li>
              )}
              {filtradas.map((opcao, i) => {
                const escolhido = opcao === valor;
                return (
                  <li key={opcao} role="none">
                    <button
                      id={`${idBase}-opcao-${i}`}
                      type="button"
                      role="option"
                      aria-selected={escolhido}
                      onMouseEnter={() => setAtivo(i)}
                      onClick={() => escolher(opcao)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)]",
                        "px-2.5 py-2 text-left text-[13.5px] text-ink",
                        i === ativo && "bg-sunken"
                      )}
                    >
                      <span className="truncate">{opcao}</span>
                      {escolhido && (
                        <Check aria-hidden className="size-4 shrink-0 text-brand-600" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {erro ? (
        <p id={`${idBase}-erro`} role="alert" className="text-[13px] font-medium text-danger">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={`${idBase}-dica`} className="text-[13px] text-muted">
            {dica}
          </p>
        )
      )}
    </div>
  );
}
