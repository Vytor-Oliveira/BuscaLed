import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Repeat, ShoppingBag } from "lucide-react";
import { ApiError } from "../api/client";
import { cancelTicket, listTickets, type Ticket, type TicketStatus } from "../api/tickets";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { Button } from "../components/ui/Button";
import { Confirmacao } from "../components/ui/Dialog";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { SeloStatus } from "../features/painel/fila/SeloStatus";
import { formatarDataLonga } from "../lib/formato";
import { ROTULO_POSICAO, type LightingPosition } from "../lib/posicoes";
import { clientePodeCancelar, numeroTicket } from "../lib/ticket";
import { cn } from "../lib/cn";

const ETAPAS: { status: TicketStatus; rotulo: string }[] = [
  { status: "PENDENTE", rotulo: "Novo" },
  { status: "CONFIRMADO", rotulo: "Em atendimento" },
  { status: "CONCLUIDO", rotulo: "Concluído" },
];

/** Linha do tempo. Cancelado sai da trilha: não é uma etapa, é um desvio. */
function LinhaDoTempo({ status }: { status: TicketStatus }) {
  if (status === "CANCELADO") {
    return (
      <p className="text-[13px] text-muted">
        Este pedido foi cancelado e não será atendido.
      </p>
    );
  }

  const atual = ETAPAS.findIndex((e) => e.status === status);

  return (
    <ol className="flex items-center gap-1.5" aria-label="Andamento do pedido">
      {ETAPAS.map((etapa, i) => {
        const alcancada = i <= atual;
        return (
          <li key={etapa.status} className="flex flex-1 items-center gap-1.5">
            <div className="flex-1">
              <span
                aria-hidden
                className={cn(
                  "block h-1.5 rounded-full",
                  alcancada ? "bg-brand-600" : "bg-sunken"
                )}
              />
              <span
                className={cn(
                  "mt-1.5 block text-[11.5px] font-semibold",
                  alcancada ? "text-ink" : "text-subtle"
                )}
              >
                {etapa.rotulo}
                {i === atual && <span className="sr-only"> — etapa atual</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function MeusPedidos() {
  const [cancelando, setCancelando] = useState<Ticket | null>(null);
  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  const consulta = useQuery({
    queryKey: ["meus-pedidos"],
    queryFn: () => listTickets().then((r) => r.tickets),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelTicket(id),
    onSuccess: () => {
      toast.sucesso("Pedido cancelado.");
      void clienteDeConsulta.invalidateQueries({ queryKey: ["meus-pedidos"] });
      setCancelando(null);
    },
    onError: (erro) =>
      toast.erro(
        "Não foi possível cancelar",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      ),
  });

  const pedidos = consulta.data ?? [];

  return (
    <>
      <SiteHeader />

      <main className="container-app py-8 lg:py-10">
        <header className="border-b border-line pb-6">
          <h1 className="text-[clamp(1.5rem,3.8vw,2.1rem)] font-bold tracking-[-0.03em] text-ink">
            Meus pedidos
          </h1>
          <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
            Acompanhe cada reserva. O representante fala com você por WhatsApp ou e-mail.
          </p>
        </header>

        {consulta.isLoading && (
          <div aria-busy className="mt-6 flex flex-col gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        )}

        {consulta.isError && (
          <div
            role="alert"
            className="mt-6 rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
          >
            <h2 className="text-[15px] font-bold text-danger">
              Não conseguimos carregar seus pedidos
            </h2>
            <p className="mt-1.5 text-[13.5px] text-danger/90">
              {consulta.error instanceof ApiError
                ? consulta.error.message
                : "Tente novamente em instantes."}
            </p>
            <Button
              variante="secundario"
              className="mt-4"
              onClick={() => void consulta.refetch()}
            >
              Tentar de novo
            </Button>
          </div>
        )}

        {consulta.data && pedidos.length === 0 && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface p-10 text-center">
            <span
              aria-hidden
              className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600"
            >
              <ShoppingBag className="size-7" />
            </span>
            <h2 className="mt-5 text-lg font-bold tracking-[-0.015em] text-ink">
              Você ainda não gerou nenhuma reserva
            </h2>
            <p className="mx-auto mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-muted">
              Busque o seu veículo, escolha os LEDs por posição e gere a primeira reserva.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-brand-600 px-5 text-sm font-semibold text-on-brand shadow-sm dark:text-[#07111c]"
            >
              Buscar meu veículo
            </Link>
          </div>
        )}

        {pedidos.length > 0 && (
          <ul aria-label="Seus pedidos" className="mt-6 flex flex-col gap-4">
            {pedidos.map((pedido) => (
              <li
                key={pedido.id}
                className="rounded-[var(--radius-md)] border border-line bg-surface"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
                  <div className="min-w-0">
                    <p
                      data-numeros
                      className="font-mono text-[15px] font-bold tracking-wide text-ink"
                    >
                      {numeroTicket(pedido.id)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {formatarDataLonga(pedido.createdAt)}
                    </p>
                  </div>
                  <SeloStatus status={pedido.status} />
                </header>

                <div className="border-b border-line px-4 py-4">
                  <LinhaDoTempo status={pedido.status} />
                </div>

                {pedido.vehicle && (
                  <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13.5px] text-muted">
                    <Car aria-hidden className="size-4 shrink-0 text-subtle" />
                    <span className="min-w-0 truncate">
                      {pedido.vehicle.make} {pedido.vehicle.model} {pedido.vehicle.year}
                    </span>
                  </p>
                )}

                <ul className="divide-y divide-line">
                  {pedido.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
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
                          {ROTULO_POSICAO[item.position as LightingPosition] ?? item.position}
                        </span>
                        {/* O cliente precisa saber que o produto mudou. */}
                        {item.originalLedModelId && (
                          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-warning-bg px-2 py-1 text-[11.5px] font-semibold text-warning">
                            <Repeat aria-hidden className="size-3" />
                            O representante substituiu este item
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* RN14: cancelar só enquanto o pedido não foi encerrado. */}
                {clientePodeCancelar(pedido.status) && (
                  <div className="flex justify-end border-t border-line bg-sunken px-4 py-3">
                    <Button
                      variante="perigo"
                      tamanho="sm"
                      onClick={() => setCancelando(pedido)}
                    >
                      Cancelar pedido
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />

      <Confirmacao
        aberto={Boolean(cancelando)}
        onFechar={() => setCancelando(null)}
        onConfirmar={() => cancelando && cancelar.mutate(cancelando.id)}
        titulo="Cancelar este pedido?"
        descricao={
          <>
            O cancelamento é definitivo: o pedido{" "}
            {cancelando && (
              <strong data-numeros className="font-semibold text-ink">
                {numeroTicket(cancelando.id)}
              </strong>
            )}{" "}
            deixa de ser atendido e não volta atrás. Você pode gerar uma nova reserva
            depois.
          </>
        }
        rotuloConfirmar="Cancelar pedido"
        destrutivo
        carregando={cancelar.isPending}
      />
    </>
  );
}
