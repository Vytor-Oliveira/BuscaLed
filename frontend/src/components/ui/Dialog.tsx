import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  rodape?: ReactNode;
  /** Dialogo largo para conteudo em lista (alternativas de produto, por exemplo). */
  largo?: boolean;
}

/**
 * Radix entrega o que uma modal escrita a mao costuma errar: trap de foco, Esc,
 * restauracao do foco ao fechar, aria-modal e bloqueio de scroll do fundo.
 */
export function Dialog({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  rodape,
  largo = false,
}: Props) {
  return (
    <RadixDialog.Root open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-[#0a121b]/55 backdrop-blur-[2px]",
            "data-[state=open]:animate-[assenta_var(--dur)_var(--ease)]"
          )}
        />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-xl",
            "data-[state=open]:assenta",
            largo ? "max-w-2xl" : "max-w-md"
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-bold tracking-[-0.01em] text-ink">
                {titulo}
              </RadixDialog.Title>
              {descricao && (
                <RadixDialog.Description className="mt-1 text-[13.5px] leading-snug text-muted">
                  {descricao}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <Button variante="fantasma" tamanho="sm" aria-label="Fechar" className="-mr-1.5 -mt-0.5 px-2">
                <X aria-hidden className="size-4.5" />
              </Button>
            </RadixDialog.Close>
          </div>

          {children && <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>}

          {rodape && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-sunken px-5 py-3.5">
              {rodape}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

interface ConfirmacaoProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  destrutivo?: boolean;
  carregando?: boolean;
}

/** Confirmacao de acao irreversivel (RN10 no cancelamento, por exemplo). */
export function Confirmacao({
  aberto,
  onFechar,
  onConfirmar,
  titulo,
  descricao,
  rotuloConfirmar,
  destrutivo = false,
  carregando = false,
}: ConfirmacaoProps) {
  return (
    <Dialog
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      descricao={descricao}
      rodape={
        <>
          <Button variante="secundario" onClick={onFechar} disabled={carregando}>
            Voltar
          </Button>
          <Button
            variante={destrutivo ? "perigo" : "primario"}
            onClick={onConfirmar}
            carregando={carregando}
          >
            {rotuloConfirmar}
          </Button>
        </>
      }
    />
  );
}
