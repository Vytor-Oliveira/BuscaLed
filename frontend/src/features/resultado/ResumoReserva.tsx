import { Link } from "react-router-dom";
import { Info, ShoppingBag, Trash2 } from "lucide-react";
import { ROTULO_POSICAO } from "../../lib/posicoes";
import { formatarTotal } from "../../lib/formato";
import { cn } from "../../lib/cn";
import { useCarrinho, type VeiculoDoCarrinho } from "../reserva/CarrinhoContext";

/**
 * Resumo fixo da seleção. No desktop é coluna grudada; no celular é barra
 * inferior, que é onde o polegar alcança.
 */
export function ResumoReserva({ veiculo }: { veiculo: VeiculoDoCarrinho | null }) {
  const { itens, total, totalCents, temItemSemPreco, remover } = useCarrinho();
  const vazio = itens.length === 0;

  return (
    <>
      {/* Desktop */}
      <aside
        aria-label="Resumo da reserva"
        className="sticky top-20 hidden rounded-[var(--radius-md)] border border-line bg-surface lg:block"
      >
        <header className="border-b border-line px-4 py-3.5">
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Sua reserva</h2>
          {veiculo && (
            <p className="mt-0.5 truncate text-[13px] text-muted">
              {veiculo.make} {veiculo.model} {veiculo.year}
            </p>
          )}
        </header>

        {vazio ? (
          <div className="px-4 py-7 text-center">
            <span
              aria-hidden
              className="mx-auto grid size-11 place-items-center rounded-full bg-sunken text-subtle"
            >
              <ShoppingBag className="size-5" />
            </span>
            <p className="mt-3 text-[13.5px] leading-snug text-muted">
              Escolha um modelo em cada posição que você quer trocar.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {itens.map((item) => (
                <li key={item.position} className="flex items-start gap-2.5 px-4 py-3">
                  <span
                    data-numeros
                    className="mt-px shrink-0 rounded-[var(--radius-xs)] bg-brand-50 px-1.5 py-0.5 text-[12px] font-bold text-brand-700"
                  >
                    {item.quantidade}x
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {item.nome}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {ROTULO_POSICAO[item.position]}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(item.position)}
                    aria-label={`Remover ${item.nome} de ${ROTULO_POSICAO[item.position]}`}
                    className="shrink-0 rounded-[var(--radius-xs)] p-1 text-subtle transition-colors hover:bg-sunken hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-line p-4">
              {totalCents > 0 && (
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-muted">
                    {temItemSemPreco ? "Parcial" : "Total estimado"}
                  </span>
                  <span data-numeros className="text-[18px] font-bold text-ink">
                    {formatarTotal(totalCents)}
                  </span>
                </div>
              )}
              {temItemSemPreco && (
                <p className="mb-3 text-[12px] leading-snug text-muted">
                  Um ou mais itens ainda não têm preço no catálogo: o representante
                  informa o valor deles.
                </p>
              )}
              <p className="flex items-start gap-2 text-[12.5px] leading-snug text-muted">
                <Info aria-hidden className="mt-px size-3.5 shrink-0" />
                Valores de referência. A reserva não é compra e não gera cobrança — o
                pagamento é combinado com o representante.
              </p>
              <Link
                to="/reserva"
                className={cn(
                  "mt-3 inline-flex h-13 w-full items-center justify-center rounded-[var(--radius-sm)]",
                  "bg-accent-500 px-5 text-[15px] font-bold text-accent-ink shadow-sm",
                  "transition-colors duration-[var(--dur-fast)] hover:bg-accent-600"
                )}
              >
                Revisar e gerar reserva
              </Link>
            </div>
          </>
        )}
      </aside>

      {/* Celular: barra inferior, só quando há seleção. */}
      {!vazio && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/96 backdrop-blur-md",
            "lg:hidden"
          )}
        >
          <div className="container-app flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p data-numeros className="text-[14px] font-bold text-ink">
                {totalCents > 0
                  ? formatarTotal(totalCents)
                  : `${total} ${total === 1 ? "kit" : "kits"}`}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                <span data-numeros>{total}</span> em {itens.length}{" "}
                {itens.length === 1 ? "posição" : "posições"}
              </p>
            </div>
            <Link
              to="/reserva"
              className="inline-flex h-12 shrink-0 items-center rounded-[var(--radius-sm)] bg-accent-500 px-5 text-sm font-bold text-accent-ink shadow-sm"
            >
              Gerar reserva
            </Link>
          </div>
        </div>
      )}
      {/* Espaço para a barra não cobrir o fim da lista. */}
      {!vazio && <div aria-hidden className="h-20 lg:hidden" />}
    </>
  );
}
