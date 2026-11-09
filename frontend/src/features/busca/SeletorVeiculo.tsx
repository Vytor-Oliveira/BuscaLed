import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Car, Search, ShieldCheck } from "lucide-react";
import { listarMarcas, listarModelos } from "../../api/compatibility";
import { Link } from "react-router-dom";
import { consultarPlaca, interpretarFalhaDePlaca, type FalhaPlaca } from "../../api/plate";
import { mascaraPlaca, placaValida } from "../../lib/formato";
import { anosDoModelo, nomesDeModelo } from "../../lib/veiculo";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Combobox } from "../../components/ui/Combobox";
import { Input, SelectNativo } from "../../components/ui/Field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs";

export interface VeiculoEscolhido {
  make: string;
  model: string;
  year: number;
}

interface Props {
  onBuscar: (veiculo: VeiculoEscolhido) => void;
  /** Na landing o seletor é o herói; em modal ele é compacto. */
  variante?: "heroi" | "compacto";
}

export function SeletorVeiculo({ onBuscar, variante = "heroi" }: Props) {
  const [aba, setAba] = useState("placa");

  const [placa, setPlaca] = useState("");
  const [erroPlaca, setErroPlaca] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [falhaDaPlaca, setFalhaDaPlaca] = useState<FalhaPlaca | null>(null);

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [erroManual, setErroManual] = useState("");

  const marcas = useQuery({
    queryKey: ["marcas"],
    queryFn: () => listarMarcas().then((r) => r.makes),
    staleTime: 10 * 60_000,
  });

  const modelos = useQuery({
    queryKey: ["modelos", marca],
    queryFn: () => listarModelos(marca).then((r) => r.models),
    enabled: marca.length > 0,
    staleTime: 10 * 60_000,
  });

  // Trocar de marca invalida o modelo escolhido antes.
  useEffect(() => {
    setModelo("");
  }, [marca]);

  // Nome pode repetir em faixas diferentes: sem dedupe o combobox colidiria
  // chave no React.
  const nomes = useMemo(() => nomesDeModelo(modelos.data ?? []), [modelos.data]);

  // A matriz usa faixas abertas (0 e 9999). O helper apara as pontas, então o
  // seletor nunca oferece ano 0 nem 9999.
  const anos = useMemo(
    () => anosDoModelo(modelos.data ?? [], modelo),
    [modelos.data, modelo]
  );

  useEffect(() => {
    // Se o ano escolhido saiu da faixa do novo modelo, limpa em vez de buscar errado.
    if (ano && !anos.includes(Number(ano))) {
      setAno("");
    }
  }, [anos, ano]);

  async function enviarPlaca(evento: FormEvent) {
    evento.preventDefault();
    setFalhaDaPlaca(null);

    if (!placaValida(placa)) {
      setErroPlaca("Confira a placa: são 7 caracteres, como ABC1D23 ou ABC1234.");
      return;
    }
    setErroPlaca("");
    setConsultando(true);

    try {
      const veiculo = await consultarPlaca(placa);
      // RN02: daqui para frente só marca, modelo e ano seguem viagem.
      setPlaca("");
      onBuscar(veiculo);
    } catch (erro) {
      // KPI de fallback automático: a falha move o visitante para o manual,
      // já com o aviso do que aconteceu, em vez de deixá-lo travado.
      setFalhaDaPlaca(interpretarFalhaDePlaca(erro));
      setAba("manual");
    } finally {
      setConsultando(false);
    }
  }

  function enviarManual(evento: FormEvent) {
    evento.preventDefault();
    if (!marca || !modelo || !ano) {
      setErroManual("Escolha marca, modelo e ano.");
      return;
    }
    setErroManual("");
    onBuscar({ make: marca, model: modelo, year: Number(ano) });
  }

  const heroi = variante === "heroi";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface",
        heroi ? "shadow-xl" : "shadow-sm"
      )}
    >
      <Tabs value={aba} onValueChange={setAba}>
        <div className={cn(heroi ? "p-3 pb-0" : "p-2.5 pb-0")}>
          <TabsList rotulo="Como você quer buscar o veículo">
            <TabsTrigger value="placa">Pela placa</TabsTrigger>
            <TabsTrigger value="manual">Marca, modelo e ano</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="placa" className={cn(heroi ? "p-5 pt-4" : "p-4 pt-3")}>
          <form onSubmit={enviarPlaca} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Input
                  rotulo="Placa do veículo"
                  value={placa}
                  onChange={(e) => {
                    setPlaca(mascaraPlaca(e.target.value));
                    setErroPlaca("");
                  }}
                  erro={erroPlaca}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={7}
                  placeholder="ABC1D23"
                  className={cn(
                    "font-mono text-[22px] font-bold tracking-[0.16em] uppercase",
                    heroi && "h-14"
                  )}
                />
              </div>
              <Button
                type="submit"
                variante="acento"
                tamanho={heroi ? "lg" : "md"}
                Icone={Search}
                carregando={consultando}
                className={cn(heroi && "sm:mt-[1.65rem] sm:h-14")}
              >
                Buscar
              </Button>
            </div>

            <p className="flex items-start gap-2 text-[13px] leading-snug text-muted">
              <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-success" />
              <span>
                <strong className="font-semibold text-ink">
                  Sua placa não é armazenada.
                </strong>{" "}
                Usamos só para descobrir marca, modelo e ano — e descartamos em seguida.
              </span>
            </p>
          </form>
        </TabsContent>

        <TabsContent value="manual" className={cn(heroi ? "p-5 pt-4" : "p-4 pt-3")}>
          {falhaDaPlaca && (
            <p
              role="status"
              className={cn(
                "mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning/35",
                "bg-warning-bg px-3 py-2.5 text-[13px] leading-snug text-warning"
              )}
            >
              <AlertTriangle aria-hidden className="mt-px size-4 shrink-0" />
              <span>
                {falhaDaPlaca.mensagem}{" "}
                {falhaDaPlaca.motivo === "precisa-entrar" ? (
                  <>
                    <Link to="/entrar" className="font-semibold underline underline-offset-2">
                      Entre na sua conta
                    </Link>{" "}
                    ou informe o veículo abaixo.
                  </>
                ) : null}
              </span>
            </p>
          )}

          <form onSubmit={enviarManual} noValidate className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Combobox
                rotulo="Marca"
                valor={marca}
                opcoes={marcas.data ?? []}
                onEscolher={setMarca}
                carregando={marcas.isLoading}
                erro={marcas.isError ? "Não conseguimos carregar as marcas." : undefined}
                placeholder="Escolha a marca"
              />
              <Combobox
                rotulo="Modelo"
                valor={modelo}
                opcoes={nomes}
                onEscolher={setModelo}
                carregando={marca.length > 0 && modelos.isLoading}
                desabilitado={!marca}
                placeholder={marca ? "Escolha o modelo" : "Escolha a marca primeiro"}
                vazio="Nenhum modelo dessa marca na matriz ainda."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <SelectNativo
                rotulo="Ano"
                value={ano}
                onChange={(e) => {
                  setAno(e.target.value);
                  setErroManual("");
                }}
                disabled={!modelo}
                erro={erroManual}
              >
                <option value="">{modelo ? "Escolha o ano" : "Escolha o modelo primeiro"}</option>
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </SelectNativo>
              <Button
                type="submit"
                variante="acento"
                tamanho={heroi ? "lg" : "md"}
                Icone={Car}
                className={cn(heroi && "sm:mt-[1.65rem] sm:h-14")}
              >
                Ver LEDs compatíveis
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
