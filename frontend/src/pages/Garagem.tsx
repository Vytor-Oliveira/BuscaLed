import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  GarageVehicle,
  addVehicleByDetails,
  addVehicleByPlate,
  listVehicles,
  removeVehicle,
} from "../api/vehicles";
import { SiteHeader } from "../components/SiteHeader";
import { SeletorVeiculo, VeiculoEscolhido } from "../components/SeletorVeiculo";
import { IconeCarro, IconeLampada, IconeLixeira, IconeMais } from "../components/Icones";

export default function Garagem() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [veiculos, setVeiculos] = useState<GarageVehicle[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  // A Home manda a placa por query quando a pessoa busca sem ter conta —
  // depois do login ela cai aqui com o campo já preenchido.
  const placaDaHome = params.get("placa") ?? "";
  const [placa, setPlaca] = useState(placaDaHome);
  const [escolhido, setEscolhido] = useState<VeiculoEscolhido | null>(null);
  const [modo, setModo] = useState<"placa" | "modelo">("placa");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { vehicles } = await listVehicles();
      setVeiculos(vehicles);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a garagem.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (placaDaHome) {
      setFormAberto(true);
    }
  }, [placaDaHome]);

  async function adicionar(event: React.FormEvent) {
    event.preventDefault();
    if (modo === "modelo" && !escolhido) {
      setErro("Selecione marca, modelo e ano.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const { vehicle } =
        modo === "placa"
          ? await addVehicleByPlate(placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
          : await addVehicleByDetails(escolhido!.make, escolhido!.model, escolhido!.year);
      setVeiculos((atuais) => [...atuais, vehicle]);
      setFormAberto(false);
      setPlaca("");
      setEscolhido(null);
      if (placaDaHome) {
        params.delete("placa");
        setParams(params, { replace: true });
      }
    } catch (error) {
      setErro(
        error instanceof ApiError ? error.message : "Não foi possível adicionar o veículo."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function remover(veiculo: GarageVehicle) {
    setRemovendo(veiculo.id);
    setErro("");
    try {
      await removeVehicle(veiculo.id);
      setVeiculos((atuais) => atuais.filter((v) => v.id !== veiculo.id));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível remover o veículo.");
    } finally {
      setRemovendo(null);
    }
  }

  function buscarLed(veiculo: GarageVehicle) {
    navigate(
      `/resultado?make=${encodeURIComponent(veiculo.make)}&model=${encodeURIComponent(
        veiculo.model
      )}&year=${veiculo.year}`
    );
  }

  return (
    <>
      <SiteHeader />

      <main className="site-conteudo">
        <div className="pagina-topo">
          <div>
            <h2>Minha Garagem</h2>
            <p className="subtitulo">Seus veículos salvos para consultas rápidas</p>
          </div>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setFormAberto((aberto) => !aberto)}
          >
            <IconeMais tamanho={14} />
            Adicionar veículo
          </button>
        </div>

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        {formAberto && (
          <form className="cartao form-veiculo" onSubmit={adicionar}>
            <div className="abas">
              <button
                type="button"
                className={modo === "placa" ? "aba aba-ativa" : "aba"}
                onClick={() => setModo("placa")}
              >
                Pela placa
              </button>
              <button
                type="button"
                className={modo === "modelo" ? "aba aba-ativa" : "aba"}
                onClick={() => setModo("modelo")}
              >
                Marca/Modelo/Ano
              </button>
            </div>

            {modo === "placa" ? (
              <label>
                Placa
                <input
                  value={placa}
                  maxLength={8}
                  onChange={(e) => setPlaca(e.target.value)}
                  placeholder="ABC1D23"
                  required
                />
              </label>
            ) : (
              <SeletorVeiculo aoEscolher={setEscolhido} />
            )}

            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar veículo"}
            </button>
          </form>
        )}

        {carregando && <p className="estado-carregando">Carregando garagem…</p>}

        {!carregando && veiculos.length === 0 && !formAberto && (
          <p className="estado-vazio">Nenhum veículo salvo ainda.</p>
        )}

        <ul className="grade-veiculos">
          {veiculos.map((veiculo) => (
            <li key={veiculo.id} className="cartao-veiculo">
              <div className="cartao-veiculo-topo">
                <span className="cartao-veiculo-icone">
                  <IconeCarro tamanho={18} />
                </span>
                <div>
                  <strong>
                    {veiculo.make} {veiculo.model}
                  </strong>
                  <small>{veiculo.year}</small>
                </div>
              </div>

              <div className="cartao-veiculo-acoes">
                <button
                  type="button"
                  className="botao-primario"
                  onClick={() => buscarLed(veiculo)}
                >
                  <IconeLampada tamanho={14} />
                  Buscar LED
                </button>
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => remover(veiculo)}
                  disabled={removendo === veiculo.id}
                  aria-label={`Remover ${veiculo.make} ${veiculo.model}`}
                >
                  <IconeLixeira tamanho={14} />
                </button>
              </div>
            </li>
          ))}

          <li>
            <button
              type="button"
              className="cartao-veiculo-vazio"
              onClick={() => setFormAberto(true)}
            >
              <span className="cartao-veiculo-mais">
                <IconeMais tamanho={18} />
              </span>
              Adicionar veículo
            </button>
          </li>
        </ul>
      </main>
    </>
  );
}
