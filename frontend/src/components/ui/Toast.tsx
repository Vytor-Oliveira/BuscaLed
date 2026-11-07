import * as RadixToast from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn";

type TomToast = "sucesso" | "erro" | "info";

interface Aviso {
  id: number;
  tom: TomToast;
  titulo: string;
  descricao?: string;
}

interface Contexto {
  avisar: (aviso: Omit<Aviso, "id">) => void;
  sucesso: (titulo: string, descricao?: string) => void;
  erro: (titulo: string, descricao?: string) => void;
}

const ToastContext = createContext<Contexto | null>(null);

const ESTILO: Record<TomToast, { classe: string; Icone: typeof Info; cor: string }> = {
  sucesso: { classe: "border-success/35", Icone: CheckCircle2, cor: "text-success" },
  erro: { classe: "border-danger/40", Icone: AlertTriangle, cor: "text-danger" },
  info: { classe: "border-line-strong", Icone: Info, cor: "text-brand-600" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((aviso: Omit<Aviso, "id">) => {
    setAvisos((atuais) => [...atuais, { ...aviso, id: Date.now() + Math.random() }]);
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      avisar,
      sucesso: (titulo, descricao) => avisar({ tom: "sucesso", titulo, descricao }),
      erro: (titulo, descricao) => avisar({ tom: "erro", titulo, descricao }),
    }),
    [avisar]
  );

  return (
    <ToastContext.Provider value={valor}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {avisos.map((aviso) => {
          const { classe, Icone, cor } = ESTILO[aviso.tom];
          return (
            <RadixToast.Root
              key={aviso.id}
              onOpenChange={(aberto) => {
                if (!aberto) {
                  setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id));
                }
              }}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-md)] border bg-raised p-3.5 shadow-lg",
                "data-[state=open]:assenta data-[swipe=end]:opacity-0",
                classe
              )}
            >
              <Icone aria-hidden className={cn("mt-0.5 size-5 shrink-0", cor)} />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-sm font-semibold text-ink">
                  {aviso.titulo}
                </RadixToast.Title>
                {aviso.descricao && (
                  <RadixToast.Description className="mt-0.5 text-[13px] leading-snug text-muted">
                    {aviso.descricao}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close
                aria-label="Fechar aviso"
                className="shrink-0 rounded-[var(--radius-xs)] p-1 text-subtle transition-colors hover:bg-sunken hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        {/* Radix já marca o viewport como região aria-live. */}
        <RadixToast.Viewport
          className={cn(
            "fixed bottom-0 right-0 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5",
            "m-4 outline-none"
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): Contexto {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  }
  return ctx;
}
