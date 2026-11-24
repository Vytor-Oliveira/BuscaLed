import { cn } from "../../lib/cn";

/**
 * Esqueleto de carregamento. Decorativo: fica fora da arvore de acessibilidade,
 * e quem anuncia o carregamento e o aria-busy da regiao.
 */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--border),var(--canvas)_35%)]",
        className
      )}
    />
  );
}

function larguraDaLinha(i: number, total: number): string {
  if (i === total - 1) {
    return "w-2/5";
  }
  return i % 2 ? "w-4/5" : "w-full";
}

export function SkeletonTexto({ linhas = 3 }: Readonly<{ linhas?: number }>) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", larguraDaLinha(i, linhas))}
        />
      ))}
    </div>
  );
}
