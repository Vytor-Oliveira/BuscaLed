import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export const Tabs = RadixTabs.Root;
export const TabsContent = RadixTabs.Content;

export function TabsList({
  children,
  className,
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  rotulo: string;
}) {
  return (
    <RadixTabs.List
      aria-label={rotulo}
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-[var(--radius-sm)] bg-sunken p-1",
        className
      )}
    >
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({
  value,
  children,
  contador,
}: {
  value: string;
  children: ReactNode;
  contador?: number;
}) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-xs)] px-3 py-2",
        "text-[13.5px] font-semibold text-muted transition-colors duration-[var(--dur-fast)]",
        "hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink",
        "data-[state=active]:shadow-sm"
      )}
    >
      {children}
      {contador !== undefined && contador > 0 && (
        <span
          data-numeros
          className={cn(
            "rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-bold leading-[1.4]",
            "text-on-brand dark:text-[#07111c]"
          )}
        >
          {contador}
        </span>
      )}
    </RadixTabs.Trigger>
  );
}
