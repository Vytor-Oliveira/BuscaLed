import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { SeletorVeiculo, VeiculoEscolhido } from "./components/SeletorVeiculo";
import { IconeBusca, IconeCaixa, IconeLampada } from "./components/Icones";

const PASSOS = [
  {
    numero: "01",
    titulo: "Busca pelo carro",
    descricao: "Informe a placa ou selecione Marca/Modelo/Ano.",
    icone: <IconeBusca tamanho={18} />,
  },
  {
    numero: "02",
    titulo: "Encontra o LED certo",
    descricao: "O motor cruza os dados com o catálogo Shocklight.",
    icone: <IconeLampada tamanho={18} />,
  },
  {
    numero: "03",
    titulo: "Pedido estruturado",
    descricao: "O pedido é enviado ao representante por e-mail.",
    icone: <IconeCaixa tamanho={18} />,
  },
];

export default function App() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<"placa" | "modelo">("placa");
  const [placa, setPlaca] = useState("");
  const [veiculo, setVeiculo] = useState<VeiculoEscolhido | null>(null);
  const [erro, setErro] = useState("");

  function buscar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");

    if (aba === "placa") {
      // A consulta de placa é paga e exige sessão; a Garagem é quem resolve
      // placa em veículo, então o caminho sem conta é por Marca/Modelo/Ano.
      const limpa = placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (limpa.length !== 7) {
        setErro("A placa precisa ter 7 caracteres.");
        return;
      }
      navigate(`/garagem?placa=${limpa}`);
      return;
    }

    if (!veiculo) {
      setErro("Selecione marca, modelo e ano.");
      return;
    }
    navigate(
      `/resultado?make=${encodeURIComponent(veiculo.make)}&model=${encodeURIComponent(
        veiculo.model
      )}&year=${veiculo.year}`
    );
  }

  return (
    <>
      <SiteHeader />

      <section className="hero">
        <span className="hero-selo">Compatibilidade LED</span>
        <h1>
          Descubra qual LED
          <span>serve no seu carro</span>
        </h1>
        <p className="hero-sub">Sem tabelas. Sem WhatsApp. Em segundos.</p>

        <form className="hero-busca" onSubmit={buscar}>
          <div className="abas">
            <button
              type="button"
              className={aba === "placa" ? "aba aba-ativa" : "aba"}
              onClick={() => setAba("placa")}
              aria-pressed={aba === "placa"}
            >
              Pela placa
            </button>
            <button
              type="button"
              className={aba === "modelo" ? "aba aba-ativa" : "aba"}
              onClick={() => setAba("modelo")}
              aria-pressed={aba === "modelo"}
            >
              Modelo/Ano
            </button>
          </div>

          {aba === "placa" ? (
            <div className="campo-placa">
              <span className="placa-mercosul" aria-hidden="true">
                <small>BRASIL</small>
                <strong>ABC·1D23</strong>
              </span>
              <input
                aria-label="Placa do veículo"
                placeholder="Digite sua placa…"
                value={placa}
                maxLength={8}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </div>
          ) : (
            <SeletorVeiculo aoEscolher={setVeiculo} />
          )}

          <button type="submit" className="botao-primario botao-largo">
            Buscar meu LED
          </button>

          {erro && (
            <p role="alert" className="mensagem-erro">
              {erro}
            </p>
          )}

          <p className="hero-privacidade">Sua placa não é armazenada em nossos servidores.</p>
        </form>
      </section>

      <section className="como-funciona" aria-label="Como funciona">
        <h2>Como funciona</h2>
        <ol>
          {PASSOS.map((passo) => (
            <li key={passo.titulo}>
              <div className="passo-topo">
                <span className="passo-numero">{passo.numero}</span>
                <span className="passo-icone">{passo.icone}</span>
              </div>
              <strong>{passo.titulo}</strong>
              <p>{passo.descricao}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
