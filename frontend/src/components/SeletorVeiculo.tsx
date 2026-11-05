import { useEffect, useMemo, useState } from "react";
import { VehicleModelOption, listarMarcas, listarModelos } from "../api/compatibility";
import { ApiError } from "../api/client";

export interface VeiculoEscolhido {
  make: string;
  model: string;
  year: number;
}

// Faixa aberta chega do catálogo como 0 (até AAAA) ou 9999 (a partir de AAAA) —
// ver parseYearRange no importador. Como o seletor é do carro que a pessoa tem,
// a janela plausível vai de 1950 (o MIN_YEAR do parser) ao ano-modelo seguinte,
// que concessionária já vende. Sem o corte, "até 1996" ofereceria o ano 0.
const ANO_MINIMO = 1950;
const ANO_MAXIMO = new Date().getFullYear() + 1;

export function rotuloFaixa(opcao: VehicleModelOption): string {
  if (opcao.yearStart === 0) {
    return `até ${opcao.yearEnd}`;
  }
  if (opcao.yearEnd === 9999) {
    return `${opcao.yearStart} em diante`;
  }
  return `${opcao.yearStart}–${opcao.yearEnd}`;
}

/**
 * Marca → Modelo → Ano em seletores encadeados. O catálogo tem ~1900 modelos
 * com grafia própria da planilha do parceiro ("FOCUS HATCH/ SE/ SE PLUS"), então
 * digitar livre quase nunca casa — a escolha precisa vir da própria lista.
 */
export function SeletorVeiculo({
  aoEscolher,
}: {
  aoEscolher: (veiculo: VeiculoEscolhido | null) => void;
}) {
  const [marcas, setMarcas] = useState<string[]>([]);
  const [modelos, setModelos] = useState<VehicleModelOption[]>([]);
  const [marca, setMarca] = useState("");
  const [indiceModelo, setIndiceModelo] = useState("");
  const [ano, setAno] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const { makes } = await listarMarcas();
        if (ativo) {
          setMarcas(makes);
        }
      } catch (error) {
        if (ativo) {
          setErro(error instanceof ApiError ? error.message : "Não foi possível carregar as marcas.");
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setModelos([]);
    setIndiceModelo("");
    setAno("");
    aoEscolher(null);

    if (!marca) {
      return;
    }

    let ativo = true;
    setCarregando(true);
    void (async () => {
      try {
        const { models } = await listarModelos(marca);
        if (ativo) {
          setModelos(models);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof ApiError ? error.message : "Não foi possível carregar os modelos."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();
    return () => {
      ativo = false;
    };
    // aoEscolher vem do pai e mudaria a cada render; o gatilho é a marca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca]);

  const escolhido = indiceModelo === "" ? null : modelos[Number(indiceModelo)];

  // Cada faixa de ano é uma linha própria do catálogo, então os anos válidos
  // saem da faixa do modelo escolhido, recortada na janela plausível.
  const anos = useMemo(() => {
    if (!escolhido) {
      return [];
    }
    const inicio = Math.max(escolhido.yearStart, ANO_MINIMO);
    const fim = Math.min(escolhido.yearEnd, ANO_MAXIMO);
    const lista: number[] = [];
    for (let a = fim; a >= inicio; a -= 1) {
      lista.push(a);
    }
    return lista;
  }, [escolhido]);

  useEffect(() => {
    if (escolhido && ano) {
      aoEscolher({ make: marca, model: escolhido.model, year: Number(ano) });
    } else {
      aoEscolher(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, indiceModelo, ano]);

  return (
    <div className="seletor-veiculo">
      <label>
        Marca
        <select value={marca} onChange={(e) => setMarca(e.target.value)}>
          <option value="">Selecione…</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label>
        Modelo
        <select
          value={indiceModelo}
          onChange={(e) => setIndiceModelo(e.target.value)}
          disabled={!marca || carregando}
        >
          <option value="">{carregando ? "Carregando…" : "Selecione…"}</option>
          {modelos.map((m, i) => (
            <option key={`${m.model}-${m.yearStart}`} value={String(i)}>
              {m.model} ({rotuloFaixa(m)})
            </option>
          ))}
        </select>
      </label>

      <label>
        Ano
        <select value={ano} onChange={(e) => setAno(e.target.value)} disabled={!escolhido}>
          <option value="">Selecione…</option>
          {anos.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </select>
      </label>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
