import * as RadixTooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export const TooltipProvider = RadixTooltip.Provider;

interface Props {
  texto: ReactNode;
  children: ReactNode;
  lado?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ texto, children, lado = "top" }: Props) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={lado}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-50 max-w-[18rem] rounded-[var(--radius-sm)] border border-line-strong",
            "bg-raised px-3 py-2 text-[13px] leading-snug text-ink shadow-lg",
            "data-[state=delayed-open]:assenta"
          )}
        >
          {texto}
          <RadixTooltip.Arrow className="fill-[var(--surface-raised)]" width={11} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/**
 * O "?" que explica jargao. E um botao de verdade: tooltip so em hover deixa
 * o conteudo inacessivel por teclado e no toque.
 */
export function AjudaInline({ texto, rotulo }: { texto: ReactNode; rotulo: string }) {
  return (
    <Tooltip texto={texto}>
      <button
        type="button"
        aria-label={rotulo}
        className="inline-flex text-subtle transition-colors hover:text-brand-600"
      >
        <HelpCircle aria-hidden className="size-4" />
      </button>
    </Tooltip>
  );
}
