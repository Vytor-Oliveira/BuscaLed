export interface PontoSerie {
  day: string;
  count: number;
}

const LARGURA = 760;
const ALTURA = 190;
const MARGEM = { topo: 12, direita: 8, baixo: 26, esquerda: 8 };

function rotuloData(dia: string): string {
  const [, mes, d] = dia.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${Number(d)} ${meses[Number(mes) - 1]}`;
}

/**
 * Série única de magnitude ao longo do tempo. Sem legenda — o título nomeia o
 * que está medido — e sem rótulo em cada ponto: só as extremidades do eixo. A
 * `table` ao lado guarda os números para leitor de tela.
 */
export function LineChart({ pontos, rotulo }: { pontos: PontoSerie[]; rotulo: string }) {
  if (pontos.length < 2) {
    return <p className="estado-vazio">Poucos dados para desenhar a série.</p>;
  }

  const maior = Math.max(...pontos.map((p) => p.count), 1);
  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.baixo;

  const x = (i: number) => MARGEM.esquerda + (i / (pontos.length - 1)) * largura;
  const y = (v: number) => MARGEM.topo + altura - (v / maior) * altura;

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.count)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1)},${MARGEM.topo + altura} L${x(0)},${MARGEM.topo + altura} Z`;

  const marcos = [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1];

  return (
    <figure className="gc-figura">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="gc-svg"
        role="img"
        aria-label={`${rotulo}: ${pontos.length} dias, pico de ${maior}.`}
      >
        <defs>
          <linearGradient id="gc-preenchimento" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2e75b6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2e75b6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#gc-preenchimento)" />
        <path
          d={linha}
          fill="none"
          stroke="#1f4e79"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {marcos.map((i) => (
          <text key={i} x={x(i)} y={ALTURA - 7} className="gc-eixo" textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}>
            {rotuloData(pontos[i].day)}
          </text>
        ))}
      </svg>

      <details className="gc-tabela">
        <summary>Ver números</summary>
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">{rotulo}</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.day}>
                <th scope="row">{rotuloData(p.day)}</th>
                <td>{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
