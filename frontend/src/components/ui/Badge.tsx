import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export type TomBadge = "neutral" | "info" | "success" | "warning" | "danger" | "acento";

const TONS: Record<TomBadge, string> = {
  neutral: "bg-sunken text-muted border-line-strong",
  info: "bg-brand-50 text-brand-700 border-brand-200 dark:border-brand-100",
  success: "bg-success-bg text-success border-success/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  danger: "bg-danger-bg text-danger border-danger/30",
  acento: "bg-accent-500/14 text-accent-600 border-accent-500/35",
};

interface Props {
  tom?: TomBadge;
  Icone?: LucideIcon;
  children: ReactNode;
  className?: string;
}

/**
 * Selo de estado. Sempre com rotulo em texto: cor nunca e o unico portador da
 * informacao (WCAG 1.4.1).
 */
export function Badge({ tom = "neutral", Icone, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[12px] font-semibold leading-none whitespace-nowrap",
        TONS[tom],
        className
      )}
    >
      {Icone && <Icone aria-hidden className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
