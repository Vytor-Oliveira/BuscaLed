import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  Info,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { ApiError } from "../api/client";
import { createTicket, type Ticket } from "../api/tickets";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { useCarrinho } from "../features/reserva/CarrinhoContext";
import { formatarPreco, formatarTotal, mascaraTelefone, telefoneValido } from "../lib/formato";
import { numeroTicket } from "../lib/ticket";
import { ROTULO_POSICAO, rotuloDoKit } from "../lib/posicoes";
import { cn } from "../lib/cn";

function Sucesso({ ticket }: { ticket: Ticket }) {
  return (
    <main className="container-app py-14">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-bg text-success">
          <CheckCircle2 aria-hidden className="size-8" />
        </span>
        <h1 className="mt-6 text-[clamp(1.6rem,4vw,2.1rem)] font-bold tracking-[-0.025em] text-ink">
          Reserva gerada
        </h1>
        <p
          data-numeros
          className="mt-3 inline-block rounded-[var(--radius-sm)] border border-line-strong bg-surface px-4 py-2 font-mono text-xl font-bold tracking-wide text-ink"
        >
          {numeroTicket(ticket.id)}
        </p>

        <ol className="mt-8 space-y-3 text-left">
          {[
            "O representante da Shocklight recebe o seu pedido e confere o estoque.",
            "Se algum item precisar ser substituído, você é avisado por e-mail.",
            "O contato para combinar valor e retirada é feito por WhatsApp.",
          ].map((passo, i) => (
            <li
              key={passo}
              className="flex gap-3 rounded-[var(--radius-sm)] border border-line bg-surface p-3.5"
            >
              <span
                data-numeros
                className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700"
              >
                {i + 1}
              </span>
              <span className="text-[14px] leading-snug text-muted">{passo}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/pedidos"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-brand-600 px-5 text-sm font-semibold text-on-brand shadow-sm dark:text-[#07111c]"
          >
            <Package aria-hidden className="size-4" />
            Acompanhar em Meus pedidos
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong bg-surface px-5 text-sm font-semibold text-ink shadow-sm"
          >
            Buscar outro veículo
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Reserva() {
  const navigate = useNavigate();
  const { veiculo, itens, total, totalCents, temItemSemPreco, ajustarQuantidade, remover, limpar } =
    useCarrinho();
  const [telefone, setTelefone] = useState("");
  const [erroTelefone, setErroTelefone] = useState("");
  const [criado, setCriado] = useState<Ticket | null>(null);

  const enviar = useMutation({
    mutationFn: () =>
      createTicket(
        itens.map((i) => ({
          ledModelId: i.ledModelId,
          position: i.position,
          quantity: i.quantidade,
        })),
        telefone ? telefone.replace(/\D/g, "") : undefined,
        veiculo ?? undefined
      ),
    onSuccess: ({ ticket }) => {
      setCriado(ticket);
      limpar();
    },
  });

  if (criado) {
    return (
      <>
        <SiteHeader />
        <Sucesso ticket={criado} />
        <SiteFooter />
      </>
    );
  }

  if (itens.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="container-app grid min-h-[60vh] place-items-center py-16">
          <div className="max-w-md text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-sunken text-subtle">
              <ShoppingBag aria-hidden className="size-7" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">
              Sua reserva está vazia
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Busque o seu veículo e escolha um modelo nas posições que você quer trocar.
            </p>
            <Button className="mt-6" Icone={ArrowLeft} onClick={() => navigate("/")}>
              Buscar meu veículo
            </Button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  function confirmar() {
    if (telefone && !telefoneValido(telefone)) {
      setErroTelefone("Informe DDD e número, como (48) 99999-9999.");
      return;
    }
    setErroTelefone("");
    enviar.mutate();
  }

  return (
    <>
      <SiteHeader />

      <main className="container-app py-8 lg:py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Voltar para o resultado
        </button>

        <h1 className="mt-4 text-[clamp(1.5rem,3.8vw,2.1rem)] font-bold tracking-[-0.03em] text-ink">
          Revise sua reserva
        </h1>
        {veiculo && (
          <p className="mt-1.5 text-[15px] text-muted">
            Para o{" "}
            <strong className="font-semibold text-ink">
              {veiculo.make} {veiculo.model} {veiculo.year}
            </strong>
          </p>
        )}

        <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
          <section aria-labelledby="itens" className="min-w-0">
            <h2 id="itens" className="sr-only">
              Itens da reserva
            </h2>

            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface">
              {itens.map((item) => (
                <li key={item.position} className="flex flex-wrap items-center gap-4 p-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`Foto do ${item.nome}`}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white object-contain p-1"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong bg-sunken text-subtle"
                    >
                      <ImageOff className="size-5" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{item.nome}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                      <span>{ROTULO_POSICAO[item.position]}</span>
                      <span aria-hidden>·</span>
                      <span data-numeros className="font-mono">
                        {item.sku}
                      </span>
                      <span aria-hidden>·</span>
                      <span data-numeros className="font-mono">
                        encaixe {item.socketCode}
                      </span>
                    </p>
                    {item.precoCents !== null ? (
                      <p data-numeros className="mt-1 text-[13.5px] text-muted">
                        {formatarPreco(item.precoCents)} {rotuloDoKit(item.unidadesPorKit)} ·{" "}
                        <strong className="font-semibold text-ink">
                          {formatarTotal(item.precoCents * item.quantidade)}
                        </strong>
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] text-muted">
                        Sem preço no catálogo — o representante informa.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variante="secundario"
                      tamanho="sm"
                      aria-label={`Diminuir quantidade de ${item.nome}`}
                      disabled={item.quantidade <= 1}
                      onClick={() => ajustarQuantidade(item.position, item.quantidade - 1)}
                      className="size-9 px-0"
                    >
                      <Minus aria-hidden className="size-4" />
                    </Button>
                    <output
                      aria-label={`Quantidade de ${item.nome}`}
                      className="w-9 text-center text-[15px] font-bold text-ink"
                    >
                      {item.quantidade}
                    </output>
                    <Button
                      variante="secundario"
                      tamanho="sm"
                      aria-label={`Aumentar quantidade de ${item.nome}`}
                      disabled={item.quantidade >= 20}
                      onClick={() => ajustarQuantidade(item.position, item.quantidade + 1)}
                      className="size-9 px-0"
                    >
                      <Plus aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variante="fantasma"
                      tamanho="sm"
                      aria-label={`Remover ${item.nome}`}
                      onClick={() => remover(item.position)}
                      className="size-9 px-0 hover:text-danger"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-[var(--radius-md)] border border-line bg-surface p-4">
              <Input
                rotulo="WhatsApp para contato (opcional)"
                value={telefone}
                onChange={(e) => {
                  setTelefone(mascaraTelefone(e.target.value));
                  setErroTelefone("");
                }}
                erro={erroTelefone}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(48) 99999-9999"
                dica="O representante usa esse número para falar com você sobre o pedido. Sem ele, o contato é por e-mail."
                prefixo={<MessageCircle aria-hidden className="size-4" />}
              />
            </div>
          </section>

          <aside className="lg:sticky lg:top-20">
            <div className="rounded-[var(--radius-md)] border border-line bg-surface">
              <div className="border-b border-line px-4 py-3.5">
                <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Resumo</h2>
              </div>
              <dl className="flex flex-col gap-2 px-4 py-3.5 text-[14px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Posições</dt>
                  <dd data-numeros className="font-semibold text-ink">
                    {itens.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Kits</dt>
                  <dd data-numeros className="font-semibold text-ink">
                    {total}
                  </dd>
                </div>
                {totalCents > 0 && (
                  <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
                    <dt className="font-semibold text-ink">
                      {temItemSemPreco ? "Parcial" : "Total estimado"}
                    </dt>
                    <dd data-numeros className="text-[19px] font-bold text-ink">
                      {formatarTotal(totalCents)}
                    </dd>
                  </div>
                )}
              </dl>

              {temItemSemPreco && (
                <p className="mx-4 mb-1 text-[12.5px] leading-snug text-muted">
                  Um ou mais itens ainda não têm preço no catálogo. O representante
                  informa o valor deles no contato.
                </p>
              )}

              {/* RN04: a reserva não é compra. Fica no caminho da ação, não no rodapé. */}
              <p
                className={cn(
                  "mx-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-brand-200",
                  "bg-brand-50 px-3 py-2.5 text-[12.5px] leading-snug text-brand-700"
                )}
              >
                <Info aria-hidden className="mt-px size-4 shrink-0" />
                Os valores são de referência do catálogo. A reserva{" "}
                <strong className="font-semibold">não é compra e não gera cobrança</strong>:
                frete, desconto e forma de pagamento são combinados com o representante.
              </p>

              {enviar.isError && (
                <p
                  role="alert"
                  className="mx-4 mt-3 rounded-[var(--radius-sm)] border border-danger/35 bg-danger-bg px-3 py-2.5 text-[13px] leading-snug text-danger"
                >
                  {enviar.error instanceof ApiError
                    ? enviar.error.message
                    : "Não conseguimos gerar a reserva. Tente novamente."}
                </p>
              )}

              <div className="p-4">
                <Button
                  larguraCheia
                  variante="acento"
                  tamanho="lg"
                  carregando={enviar.isPending}
                  onClick={confirmar}
                >
                  Gerar reserva
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
