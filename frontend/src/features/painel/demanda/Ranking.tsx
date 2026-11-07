import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { formatarInteiro } from "../../../lib/formato";

export interface LinhaDeRanking {
  chave: string;
  rotulo: string;
  /** Linha fina sob o rótulo: SKU, mínimo, o que ajude a identificar. */
  detalhe?: string;
  valor: number;
  /**
   * Parte do valor que merece destaque próprio — por exemplo, buscas sem
   * resultado dentro do total. Mesmo matiz em passo mais claro, nunca segunda
   * cor: a informação vai no número, não na cor.
   */
  destaque?: { valor: number; rotulo: string };
}

interface Props {
  titulo: string;
  descricao?: string;
  linhas: LinhaDeRanking[];
  sufixo: string;
  vazio: string;
  /** Link para a tela que resolve o que o ranking mostra. */
  acao?: { para: string; rotulo: string };
}

/**
 * Ranking como tabela de verdade: o leitor de tela recebe rótulo e valor com
 * contexto de coluna, e a barra é só a leitura visual do mesmo número. Série
 * única, um matiz, sem legenda — o título já diz o que está medido.
 */
export function Ranking({ titulo, descricao, linhas, sufixo, vazio, acao }: Props) {
  const maximo = Math.max(1, ...linhas.map((l) => l.valor));

  return (
    <section className="flex flex-col rounded-[var(--radius-md)] border border-line bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{titulo}</h3>
          {descricao && (
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{descricao}</p>
          )}
        </div>
        {acao && (
          <Link
            to={acao.para}
            className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-600 hover:underline"
          >
            {acao.rotulo}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </header>

      {linhas.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px] leading-snug text-muted">{vazio}</p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{titulo}</caption>
          <colgroup>
            <col />
            <col className="w-24" />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">{sufixo}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const largura = Math.max(2, (linha.valor / maximo) * 100);
              const larguraDestaque = linha.destaque
                ? Math.max(0, (linha.destaque.valor / maximo) * 100)
                : 0;

              return (
                <tr key={linha.chave} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 text-left align-top font-normal">
                    <span className="block break-words text-[13.5px] font-semibold text-ink">
                      {linha.rotulo}
                    </span>
                    {linha.detalhe && (
                      <span className="mt-0.5 block break-words font-mono text-[11.5px] text-subtle">
                        {linha.detalhe}
                      </span>
                    )}

                    {/* Barra fina, extremidade arredondada, ancorada na base. */}
                    <span
                      aria-hidden
                      className="relative mt-2 block h-2 overflow-hidden rounded-full bg-sunken"
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
                        style={{ width: `${largura}%` }}
                      />
                      {linha.destaque && linha.destaque.valor > 0 && (
                        // 2px de folga separa os trechos sem precisar de borda.
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-300"
                          style={{ width: `calc(${larguraDestaque}% - 2px)` }}
                        />
                      )}
                    </span>

                    {linha.destaque && linha.destaque.valor > 0 && (
                      <span className="mt-1.5 block text-[11.5px] font-semibold text-brand-700">
                        <span data-numeros>{formatarInteiro(linha.destaque.valor)}</span>{" "}
                        {linha.destaque.rotulo}
                      </span>
                    )}
                  </th>

                  <td className="px-4 py-3 text-right align-top">
                    <span data-numeros className="text-[13.5px] font-bold text-ink">
                      {formatarInteiro(linha.valor)}
                      <span className="ml-1 font-normal text-muted">{sufixo}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
