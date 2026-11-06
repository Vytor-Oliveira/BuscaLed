import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export type VarianteBotao = "primario" | "acento" | "secundario" | "fantasma" | "perigo";
export type TamanhoBotao = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap " +
  "rounded-[var(--radius-sm)] transition-[background-color,border-color,color,box-shadow,transform] " +
  "duration-[var(--dur-fast)] ease-(--ease-out-expo) select-none " +
  "active:scale-[.985] disabled:pointer-events-none disabled:opacity-55";

const VARIANTES: Record<VarianteBotao, string> = {
  primario:
    "bg-brand-600 text-on-brand shadow-sm hover:bg-brand-700 " +
    "dark:text-[#07111c] dark:hover:bg-brand-700",
  // Texto escuro sobre o ambar: branco sobre ambar nao passa contraste.
  acento: "bg-accent-500 text-accent-ink shadow-sm hover:bg-accent-600",
  secundario:
    "border border-line-strong bg-surface text-ink shadow-sm hover:bg-sunken hover:border-line-strong",
  fantasma: "text-muted hover:bg-sunken hover:text-ink",
  perigo: "border border-danger/35 bg-danger-bg text-danger hover:border-danger/60",
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  Icone?: LucideIcon;
  larguraCheia?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variante = "primario",
    tamanho = "md",
    carregando = false,
    Icone,
    larguraCheia = false,
    className,
    children,
    disabled,
    ...resto
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled ?? carregando}
      // O leitor de tela precisa saber que o botao esta ocupado, nao quebrado.
      aria-busy={carregando || undefined}
      className={cn(
        BASE,
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraCheia && "w-full",
        className
      )}
      {...resto}
    >
      {carregando ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        Icone && <Icone aria-hidden className="size-4 shrink-0" />
      )}
      {children}
    </button>
  );
});
