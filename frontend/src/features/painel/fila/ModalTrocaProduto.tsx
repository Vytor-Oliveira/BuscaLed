import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Mail, PackageX } from "lucide-react";
import { ApiError } from "../../../api/client";
import {
  listItemAlternatives,
  updateTicketItem,
  type Ticket,
  type TicketItem,
} from "../../../api/tickets";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { ROTULO_POSICAO, type LightingPosition } from "../../../lib/posicoes";
import { cn } from "../../../lib/cn";

interface Props {
  ticket: Ticket | null;
  onFechar: () => void;
}

export function ModalTrocaProduto({ ticket, onFechar }: Props) {
  const [itemId, setItemId] = useState<string | null>(null);
  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  // Um item só: não faz sentido pedir para escolher qual.
  const unico = ticket?.items.length === 1 ? ticket.items[0] : null;
  const escolhido: TicketItem | null =
    ticket?.items.find((i) => i.id === itemId) ?? unico ?? null;

  const alternativas = useQuery({
    queryKey: ["alternativas", ticket?.id, escolhido?.id],
    queryFn: () => listItemAlternatives(ticket!.id, escolhido!.id).then((r) => r.alternatives),
    enabled: Boolean(ticket && escolhido),
  });

  const trocar = useMutation({
    mutationFn: (ledModelId: string) =>
      updateTicketItem(ticket!.id, escolhido!.id, ledModelId),
    onSuccess: () => {
      toast.sucesso("Produto trocado.", "O cliente foi notificado por e-mail.");
      void clienteDeConsulta.invalidateQueries({ queryKey: ["tickets"] });
      fechar();
    },
    onError: (erro) =>
      toast.erro(
        "Não foi possível trocar",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      ),
  });

  function fechar() {
    setItemId(null);
    onFechar();
  }

  const passo2 = Boolean(escolhido);

  return (
    <Dialog
      largo
      aberto={Boolean(ticket)}
      onFechar={fechar}
      titulo={passo2 ? "Escolha o substituto" : "Qual item vai ser trocado?"}
      descricao={
        passo2 && escolhido ? (
          <>
            Trocando <strong className="font-semibold text-ink">{escolhido.ledModelName}</strong>{" "}
            em {ROTULO_POSICAO[escolhido.position as LightingPosition] ?? escolhido.position}.
            Só aparecem modelos do mesmo encaixe e com estoque.
          </>
        ) : (
          "O pedido tem mais de um item. Escolha qual você quer substituir."
        )
      }
      rodape={
        passo2 && !unico ? (
          <Button variante="secundario" Icone={ArrowLeft} onClick={() => setItemId(null)}>
            Escolher outro item
          </Button>
        ) : undefined
      }
    >
      {!passo2 && ticket && (
        <ul className="flex flex-col gap-2">
          {ticket.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setItemId(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-line",
                  "bg-surface p-3 text-left transition-colors hover:border-line-strong"
                )}
              >
                <span
                  data-numeros
                  className="shrink-0 rounded-[var(--radius-xs)] bg-brand-50 px-1.5 py-0.5 text-[12px] font-bold text-brand-700"
                >
                  {item.quantity}x
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">
                    {item.ledModelName}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {ROTULO_POSICAO[item.position as LightingPosition] ?? item.position} ·{" "}
                    <span className="font-mono">{item.ledModelSku}</span>
                  </span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {passo2 && (
        <>
          {alternativas.isLoading && (
            <div aria-busy className="flex flex-col gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}

          {alternativas.isError && (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-danger/35 bg-danger-bg px-3.5 py-3 text-[13.5px] text-danger"
            >
              {alternativas.error instanceof ApiError
                ? alternativas.error.message
                : "Não conseguimos carregar as alternativas."}
            </p>
          )}

          {alternativas.data?.length === 0 && (
            <div className="py-6 text-center">
              <span
                aria-hidden
                className="mx-auto grid size-12 place-items-center rounded-full bg-sunken text-subtle"
              >
                <PackageX className="size-5" />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink">
                Nenhuma alternativa disponível
              </p>
              <p className="mx-auto mt-1 max-w-[38ch] text-[13px] leading-snug text-muted">
                Não há outro modelo com o mesmo encaixe e estoque suficiente (RN11). Repor
                estoque pode liberar opções.
              </p>
            </div>
          )}

          {alternativas.data && alternativas.data.length > 0 && (
            <>
              <ul className="flex flex-col gap-2">
                {alternativas.data.map((alternativa) => (
                  <li key={alternativa.id}>
                    <button
                      type="button"
                      disabled={trocar.isPending}
                      onClick={() => trocar.mutate(alternativa.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-line",
                        "bg-surface p-3 text-left transition-colors hover:border-brand-600",
                        "disabled:pointer-events-none disabled:opacity-60"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-ink">
                          {alternativa.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span data-numeros className="font-mono text-[12.5px] text-muted">
                            {alternativa.sku}
                          </span>
                          <span data-numeros className="font-mono text-[12.5px] text-muted">
                            encaixe {alternativa.socketCode}
                          </span>
                          <Badge tom="success">{alternativa.stockQty} em estoque</Badge>
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-subtle"
                      >
                        <Check className="size-4" />
                      </span>
                      <span className="sr-only">Trocar por {alternativa.name}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-brand-200 bg-brand-50 px-3 py-2.5 text-[12.5px] leading-snug text-brand-700">
                <Mail aria-hidden className="mt-px size-4 shrink-0" />
                Ao confirmar a troca, o cliente é notificado por e-mail automaticamente.
              </p>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
