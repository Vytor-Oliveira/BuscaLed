import * as RadixDialog from "@radix-ui/react-dialog";
import { useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  Car,
  CheckCheck,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Repeat,
  X,
} from "lucide-react";
import type { Ticket } from "../../../api/tickets";
import { Button } from "../../../components/ui/Button";
import { Confirmacao } from "../../../components/ui/Dialog";
import { formatarDataHora, tempoRelativo } from "../../../lib/formato";
import { ROTULO_POSICAO, type LightingPosition } from "../../../lib/posicoes";
import { estadoFinal, numeroTicket } from "../../../lib/ticket";
import { montarLinkWhatsApp, montarMensagem } from "../../../lib/whatsapp";
import { cn } from "../../../lib/cn";
import { SeloStatus } from "./SeloStatus";
import { useAcoesDoPedido, type Acao } from "./useAcoesDoPedido";

interface Props {
  ticket: Ticket | null;
  onFechar: () => void;
  onTrocar: (ticket: Ticket) => void;
}

function Dado({
  Icone,
  rotulo,
  children,
}: {
  Icone: typeof Mail;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icone aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
      <div className="min-w-0">
        <dt className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
          {rotulo}
        </dt>
        <dd className="mt-0.5 break-words text-[14px] text-ink">{children}</dd>
      </div>
    </div>
  );
}

export function DetalheDoPedido({ ticket, onFechar, onTrocar }: Props) {
  const acoes = useAcoesDoPedido();
  const [confirmandoCancelamento, setConfirmando] = useState(false);

  if (!ticket) {
    return null;
  }

  const link = ticket.customerPhone
    ? montarLinkWhatsApp(ticket.customerPhone, montarMensagem(ticket))
    : null;
  const encerrado = estadoFinal(ticket.status);

  function agir(acao: Acao) {
    acoes.mutate({ id: ticket!.id, acao });
  }

  return (
    <RadixDialog.Root open onOpenChange={(v) => !v && onFechar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-[#0a121b]/50" />
        <RadixDialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-xl",
            "data-[state=open]:animate-[assenta_var(--dur)_var(--ease)]"
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title
                data-numeros
                className="font-mono text-[17px] font-bold tracking-wide text-ink"
              >
                {numeroTicket(ticket.id)}
              </RadixDialog.Title>
              <RadixDialog.Description className="mt-1 text-[13px] text-muted">
                Criado em {formatarDataHora(ticket.createdAt)} · {tempoRelativo(ticket.createdAt)}
              </RadixDialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SeloStatus status={ticket.status} />
              <RadixDialog.Close
                aria-label="Fechar detalhe"
                className="rounded-[var(--radius-xs)] p-1.5 text-subtle hover:bg-sunken hover:text-ink"
              >
                <X aria-hidden className="size-4.5" />
              </RadixDialog.Close>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <dl className="flex flex-col gap-4">
              <Dado Icone={Mail} rotulo="Cliente">
                {ticket.userEmail}
              </Dado>
              <Dado Icone={Phone} rotulo="WhatsApp">
                {ticket.customerPhone ?? (
                  <span className="text-muted">Não informado — contato por e-mail.</span>
                )}
              </Dado>
              <Dado Icone={Car} rotulo="Veículo da busca">
                {ticket.vehicle ? (
                  `${ticket.vehicle.make} ${ticket.vehicle.model} ${ticket.vehicle.year}`
                ) : (
                  <span className="text-muted">
                    Pedido criado antes de o veículo passar a ser guardado.
                  </span>
                )}
              </Dado>
            </dl>

            <h3 className="mt-7 text-[12px] font-semibold uppercase tracking-wider text-subtle">
              Itens do pedido
            </h3>
            <ul className="mt-2.5 divide-y divide-line overflow-hidden rounded-[var(--radius-sm)] border border-line">
              {ticket.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 bg-surface p-3">
                  <span
                    data-numeros
                    className="shrink-0 rounded-[var(--radius-xs)] bg-brand-50 px-1.5 py-0.5 text-[12px] font-bold text-brand-700"
                  >
                    {item.quantity}x
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">
                      {item.ledModelName}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">
                      {ROTULO_POSICAO[item.position as LightingPosition] ?? item.position} ·{" "}
                      <span className="font-mono">{item.ledModelSku}</span>
                    </span>
                    {/* originalLedModelId só existe quando houve substituição. */}
                    {item.originalLedModelId && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-warning-bg px-2 py-1 text-[11.5px] font-semibold text-warning">
                        <Repeat aria-hidden className="size-3" />
                        Substituído pelo representante
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <footer className="border-t border-line bg-sunken px-5 py-4">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "mb-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)]",
                  "bg-[#25d366] px-4 text-sm font-semibold text-[#06281a] shadow-sm"
                )}
              >
                <MessageCircle aria-hidden className="size-4" />
                Falar no WhatsApp
              </a>
            )}

            {!encerrado && (
              <div className="grid grid-cols-2 gap-2">
                {ticket.status === "PENDENTE" && (
                  <Button
                    Icone={CheckCircle2}
                    carregando={acoes.isPending}
                    onClick={() => agir("confirmar")}
                  >
                    Confirmar
                  </Button>
                )}
                {ticket.status === "CONFIRMADO" && (
                  <Button
                    Icone={CheckCheck}
                    carregando={acoes.isPending}
                    onClick={() => agir("concluir")}
                  >
                    Concluir
                  </Button>
                )}
                <Button
                  variante="secundario"
                  Icone={ArrowLeftRight}
                  onClick={() => onTrocar(ticket)}
                >
                  Trocar produto
                </Button>
                <Button
                  variante="perigo"
                  Icone={Ban}
                  className="col-span-2"
                  onClick={() => setConfirmando(true)}
                >
                  Cancelar pedido
                </Button>
              </div>
            )}

            {ticket.status === "CONFIRMADO" && (
              // RN12: concluir é o que baixa o estoque, e isso precisa estar dito
              // antes do clique, não depois.
              <p className="mt-2.5 text-[12.5px] leading-snug text-muted">
                Concluir baixa a quantidade dos itens no estoque.
              </p>
            )}
          </footer>
        </RadixDialog.Content>
      </RadixDialog.Portal>

      <Confirmacao
        aberto={confirmandoCancelamento}
        onFechar={() => setConfirmando(false)}
        onConfirmar={() => {
          setConfirmando(false);
          agir("cancelar");
        }}
        titulo="Cancelar este pedido?"
        descricao={
          <>
            O cancelamento é <strong className="font-semibold text-ink">irreversível</strong>:
            um pedido cancelado não volta a ser editado (RN10). O cliente deixa de ser
            atendido por este pedido.
          </>
        }
        rotuloConfirmar="Cancelar o pedido"
        destrutivo
      />
    </RadixDialog.Root>
  );
}
