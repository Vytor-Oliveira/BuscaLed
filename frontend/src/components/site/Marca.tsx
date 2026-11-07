import { Lightbulb } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * "BuscaLED" com o LED em peso e cor. O ícone de lâmpada é compromisso de
 * marca registrado em PRODUCT.md.
 */
export function Marca({
  className,
  tamanho = "md",
}: {
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const caixa = tamanho === "lg" ? "size-10" : tamanho === "sm" ? "size-7" : "size-8";
  const icone = tamanho === "lg" ? "size-5.5" : tamanho === "sm" ? "size-4" : "size-4.5";
  const texto = tamanho === "lg" ? "text-xl" : tamanho === "sm" ? "text-[15px]" : "text-[17px]";

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
