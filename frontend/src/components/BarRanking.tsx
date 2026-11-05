export interface RankingItem {
  id: string;
  rotulo: string;
  detalhe?: string;
  valor: number;
}

/**
 * Ranking de magnitude em barras horizontais (Tela 8 do RFC). É uma `table` de
 * verdade, não `div`s: a leitura em tabela já vem de graça para leitor de tela,
 * e a barra é só a camada visual por cima. Série única, então não há legenda —
 * o título nomeia o que está medido.
 */
export function BarRanking({
  titulo,
  descricao,
  itens,
  rotuloValor,
  vazio,
}: {
  titulo: string;
  descricao?: string;
  itens: RankingItem[];
  rotuloValor: string;
  vazio: string;
}) {
  const maior = itens.reduce((max, item) => Math.max(max, item.valor), 0);

  return (
    <section className="cartao">
      <div className="cartao-titulo">
        <h3>{titulo}</h3>
      </div>
      {descricao && <p className="ranking-descricao">{descricao}</p>}

      {itens.length === 0 ? (
        <p className="estado-vazio">{vazio}</p>
      ) : (
        <table className="ranking-tabela">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">{rotuloValor}</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  {item.rotulo}
                  {item.detalhe && <small>{item.detalhe}</small>}
                  <span className="ranking-barra-trilho">
                    <span
                      className="ranking-barra"
                      // Largura proporcional ao maior valor da lista: o eixo é a
                      // própria lista, então não há escala a rotular.
                      style={{ width: maior > 0 ? `${(item.valor / maior) * 100}%` : "0%" }}
                    />
                  </span>
                </th>
                <td className="ranking-valor">{item.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
