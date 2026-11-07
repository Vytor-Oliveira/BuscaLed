import { Monitor, Moon, Sun } from "lucide-react";
import { useTema, type Tema } from "../../app/theme";
import { cn } from "../../lib/cn";

const OPCOES: { valor: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Tema claro", Icone: Sun },
  { valor: "escuro", rotulo: "Tema escuro", Icone: Moon },
  { valor: "sistema", rotulo: "Seguir o sistema", Icone: Monitor },
];

/**
 * Três estados explícitos em vez de um botão que alterna: "seguir o sistema" é
 * uma escolha de verdade, e um alternador de dois estados não consegue voltar
 * para ela.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { tema, definirTema } = useTema();

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5",
        className
      )}
    >
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = tema === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => definirTema(valor)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors duration-[var(--dur-fast)]",
              ativo ? "bg-brand-600 text-on-brand dark:text-[#07111c]" : "text-subtle hover:text-ink"
            )}
          >
            <Icone aria-hidden className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
