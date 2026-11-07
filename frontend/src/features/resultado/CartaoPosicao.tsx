import { Check, ImageOff, Minus, Plus, TriangleAlert } from "lucide-react";
import { Fragment } from "react";
import type { CompatibleLed, PositionCompatibility } from "../../api/compatibility";
import {
  META_POSICAO,
  ROTULO_POSICAO,
  quantidadePadrao,
  rotuloDoKit,
} from "../../lib/posicoes";
import { formatarPreco } from "../../lib/formato";
import { cn } from "../../lib/cn";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Tooltip } from "../../components/ui/Tooltip";
import { useCarrinho } from "../reserva/CarrinhoContext";

function FotoProduto({ url, nome }: { url: string | null; nome: string }) {
  if (!url) {
    return (
      <span
        aria-hidden
        className="grid size-20 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong bg-sunken text-subtle sm:size-24"
      >
        <ImageOff className="size-6" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={`Foto do ${nome}`}
      loading="lazy"
      width={96}
      height={96}
      className="size-20 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white object-contain p-1 sm:size-24"
    />
  );
}

function LinhaModelo({
  modelo,
  posicao,
  escolhido,
  destacarEncaixe,
  onEscolher,
}: {
  modelo: CompatibleLed;
  posicao: PositionCompatibility["position"];
  escolhido: boolean;
  /** Quando a posição tem mais de um encaixe, é ele que distingue os produtos. */
  destacarEncaixe: boolean;
  onEscolher: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEscolher}
        aria-pressed={escolhido}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-[var(--radius-sm)] border p-3 text-left",
          "transition-[border-color,background-color] duration-[var(--dur-fast)]",
          escolhido
            ? "border-brand-600 bg-brand-50"
            : "border-line bg-surface hover:border-line-strong"
        )}
      >
        <FotoProduto url={modelo.imageUrl} nome={modelo.name} />

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{modelo.name}</span>
          <span className="mt-1 block">
            <span data-numeros className="font-mono text-[12.5px] text-muted">
              {modelo.sku}
            </span>
          </span>
          <span
            data-numeros
            className={cn(
              "mt-0.5 block font-mono text-[12.5px]",
              destacarEncaixe
                ? "font-bold text-brand-700"
                : "text-subtle"
            )}
          >
            {destacarEncaixe ? `serve no encaixe ${modelo.socketCode}` : `encaixe ${modelo.socketCode}`}
          </span>
          {/* Preco ausente e estado, nao linha que desaparece: sumir faz o
              cliente achar que a pagina nao carregou. */}
          <span data-numeros className="mt-1.5 block text-[16px] font-bold text-ink">
            {formatarPreco(modelo.priceCents) ? (
              <>
                {formatarPreco(modelo.priceCents)}
                <span className="ml-1 text-[12px] font-normal text-muted">
                  {rotuloDoKit(modelo.unitsPerKit)}
                </span>
              </>
            ) : (
              <span className="text-[13px] font-normal text-subtle">sem preço</span>
            )}
          </span>
        </span>

        {/* Situação junto da seleção: é o que decide o clique, e assim a linha
            alta da foto não deixa um vão vazio no meio. */}
        <span className="flex shrink-0 items-center gap-3.5">
          {modelo.inStock ? (
            <Badge tom="success">Em estoque</Badge>
          ) : (
            <Badge tom="warning">Sob consulta</Badge>
          )}
          <span
            aria-hidden
            className={cn(
              "grid size-6 place-items-center rounded-full border-2",
              escolhido ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong"
            )}
          >
            {escolhido && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </span>
        <span className="sr-only">
          {escolhido ? "Selecionado para" : "Selecionar para"} {ROTULO_POSICAO[posicao]}
        </span>
      </button>
    </li>
  );
}

export function CartaoPosicao({ dados }: { dados: PositionCompatibility }) {
  const { escolhidoEm, escolher, remover, ajustarQuantidade } = useCarrinho();
  const { icone: Icone, explicacao } = META_POSICAO[dados.position];
  const selecao = escolhidoEm(dados.position);

  // Mais de um encaixe na mesma posicao nao significa duas lampadas: significa
  // que o modelo saiu em versoes diferentes e o carro usa UMA delas.
  const temAlternativa = dados.socketCodes.length > 1;
  const comProduto = new Set(dados.models.map((m) => m.socketCode));
  const semProduto = dados.socketCodes.filter((codigo) => !comProduto.has(codigo));

  return (
    <section
      aria-labelledby={`pos-${dados.position}`}
      className="rounded-[var(--radius-md)] border border-line bg-surface"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand-50 text-brand-600"
          >
            <Icone className="size-5" />
          </span>
          <div className="min-w-0">
            <h3
              id={`pos-${dados.position}`}
              className="text-[16px] font-bold tracking-[-0.01em] text-ink"
            >
              {ROTULO_POSICAO[dados.position]}
            </h3>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{explicacao}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {dados.socketCodes.map((codigo, i) => (
            <Fragment key={codigo}>
              {i > 0 && <span className="text-[12px] text-subtle">ou</span>}
              <Tooltip
                texto={
                  temAlternativa
                    ? `Encaixe ${codigo}: um dos formatos que este modelo usa nesta posição. Confira qual está no seu carro.`
                    : `Encaixe ${codigo}: é o formato do pé da lâmpada nesta posição do seu carro.`
                }
                lado="bottom"
              >
                <button
                  type="button"
                  data-numeros
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[12px] font-semibold",
                    semProduto.includes(codigo)
                      ? "border-dashed border-line-strong bg-transparent text-subtle"
                      : "border-line-strong bg-sunken text-muted"
                  )}
                >
                  {codigo}
                </button>
              </Tooltip>
            </Fragment>
          ))}
        </div>
      </header>

      <div className="p-4">
        {temAlternativa && (
          // O mesmo modelo/ano saiu de fabrica com farol halogeno e xenon. Sem
          // este aviso, quem tem xenon escolhe um produto H7 que nao entra.
          <p
            className={cn(
              "mb-3.5 flex items-start gap-2 rounded-[var(--radius-sm)] border",
              "border-warning/35 bg-warning-bg px-3 py-2.5 text-[12.5px] leading-snug text-warning"
            )}
          >
            <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
            <span>
              Este modelo saiu de fábrica com mais de um tipo de farol. Veja o código
              escrito na lâmpada que está no seu carro antes de escolher
              {semProduto.length > 0 && (
                <>
                  {" "}
                  — ainda não temos LED para{" "}
                  <strong className="font-semibold">{semProduto.join(" e ")}</strong>
                </>
              )}
              .
            </span>
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {dados.models.map((modelo) => (
            <LinhaModelo
              key={modelo.ledModelId}
              modelo={modelo}
              posicao={dados.position}
              destacarEncaixe={temAlternativa}
              escolhido={selecao?.ledModelId === modelo.ledModelId}
              onEscolher={() => {
                if (selecao?.ledModelId === modelo.ledModelId) {
                  remover(dados.position);
                  return;
                }
                escolher({
                  ledModelId: modelo.ledModelId,
                  position: dados.position,
                  sku: modelo.sku,
                  nome: modelo.name,
                  socketCode: modelo.socketCode,
                  imageUrl: modelo.imageUrl,
                  precoCents: modelo.priceCents,
                  unidadesPorKit: modelo.unitsPerKit,
                  quantidade: selecao?.quantidade ?? quantidadePadrao(dados.position),
                });
              }}
            />
          ))}
        </ul>

        {selecao && (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-sunken p-2.5 pl-3.5">
            <span className="text-[13.5px] font-semibold text-ink">
              Quantidade
              {META_POSICAO[dados.position].emPar && selecao.unidadesPorKit >= 2 && (
                <span className="ml-1.5 font-normal text-muted">
                  — 1 kit já cobre os dois lados
                </span>
              )}
              {META_POSICAO[dados.position].emPar && selecao.unidadesPorKit < 2 && (
                <span className="ml-1.5 font-normal text-muted">
                  — vendido por unidade, e essa luz existe nos dois lados
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variante="secundario"
                tamanho="sm"
                aria-label="Diminuir quantidade"
                disabled={selecao.quantidade <= 1}
                onClick={() => ajustarQuantidade(dados.position, selecao.quantidade - 1)}
                className="size-9 px-0"
              >
                <Minus aria-hidden className="size-4" />
              </Button>
              <output
                aria-label={`Quantidade de ${selecao.nome}`}
                className="w-10 text-center text-[15px] font-bold text-ink"
              >
                {selecao.quantidade}
              </output>
              <Button
                variante="secundario"
                tamanho="sm"
                aria-label="Aumentar quantidade"
                disabled={selecao.quantidade >= 20}
                onClick={() => ajustarQuantidade(dados.position, selecao.quantidade + 1)}
                className="size-9 px-0"
              >
                <Plus aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
