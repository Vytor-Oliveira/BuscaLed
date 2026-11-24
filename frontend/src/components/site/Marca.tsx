import { Lightbulb } from "lucide-react";
import { cn } from "../../lib/cn";

const TAMANHOS = {
  sm: { caixa: "size-7", icone: "size-4", texto: "text-[15px]" },
  md: { caixa: "size-8", icone: "size-4.5", texto: "text-[17px]" },
  lg: { caixa: "size-10", icone: "size-5.5", texto: "text-xl" },
} as const;

/**
 * "BuscaLED" com o LED em peso e cor. O ícone de lâmpada é compromisso de
 * marca registrado em PRODUCT.md.
 */
export function Marca({
  className,
  tamanho = "md",
}: Readonly<{
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}>) {
  const { caixa, icone, texto } = TAMANHOS[tamanho];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand-600",
          "text-accent-400 shadow-sm",
          caixa
        )}
      >
        <Lightbulb className={icone} />
      </span>
      <span className={cn("font-bold tracking-[-0.02em] text-ink", texto)}>
        Busca<span className="text-brand-600">LED</span>
      </span>
    </span>
  );
}
