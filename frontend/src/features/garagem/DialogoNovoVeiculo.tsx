import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { addVehicleByDetails, addVehicleByPlate } from "../../api/vehicles";
import { ApiError } from "../../api/client";
import { interpretarFalhaDePlaca } from "../../api/plate";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input, SelectNativo } from "../../components/ui/Field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/Toast";
import { Combobox } from "../../components/ui/Combobox";
import { useQuery } from "@tanstack/react-query";
import { listarMarcas, listarModelos } from "../../api/compatibility";
import { mascaraPlaca, placaValida } from "../../lib/formato";
import { anosDoModelo, nomesDeModelo } from "../../lib/veiculo";
import { cn } from "../../lib/cn";

export function DialogoNovoVeiculo({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const [aba, setAba] = useState("placa");
  const [placa, setPlaca] = useState("");
  const [erroPlaca, setErroPlaca] = useState("");
  const [avisoFallback, setAvisoFallback] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [erroManual, setErroManual] = useState("");

  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  const marcas = useQuery({
    queryKey: ["marcas"],
    queryFn: () => listarMarcas().then((r) => r.makes),
    enabled: aberto,
    staleTime: 10 * 60_000,
  });

  const modelos = useQuery({
    queryKey: ["modelos", marca],
    queryFn: () => listarModelos(marca).then((r) => r.models),
    enabled: aberto && marca.length > 0,
    staleTime: 10 * 60_000,
  });

  function sucesso() {
    toast.sucesso("Veículo salvo na garagem.");
    void clienteDeConsulta.invalidateQueries({ queryKey: ["garagem"] });
    fechar();
  }

  const porPlaca = useMutation({
    mutationFn: () => addVehicleByPlate(placa),
    onSuccess: sucesso,
    onError: (erro) => {
      // Falha de placa cai para o manual com o aviso, em vez de travar.
      setAvisoFallback(interpretarFalhaDePlaca(erro).mensagem);
      setAba("manual");
    },
  });

  const porDetalhes = useMutation({
    mutationFn: () => addVehicleByDetails(marca, modelo, Number(ano)),
    onSuccess: sucesso,
    onError: (erro) =>
      setErroManual(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar o veículo."
      ),
  });

  function fechar() {
    setPlaca("");
    setErroPlaca("");
    setAvisoFallback("");
    setMarca("");
    setModelo("");
    setAno("");
    setErroManual("");
    setAba("placa");
    onFechar();
  }

  function enviarPlaca(evento: FormEvent) {
    evento.preventDefault();
    if (!placaValida(placa)) {
      setErroPlaca("Confira a placa: são 7 caracteres, como ABC1D23 ou ABC1234.");
      return;
    }
    setErroPlaca("");
    porPlaca.mutate();
  }

  function enviarManual(evento: FormEvent) {
    evento.preventDefault();
    if (!marca || !modelo || !ano) {
      setErroManual("Escolha marca, modelo e ano.");
      return;
    }
    porDetalhes.mutate();
  }

  return (
    <Dialog
      aberto={aberto}
      onFechar={fechar}
      titulo="Adicionar veículo"
      descricao="A placa serve só para descobrir o veículo: ela não é guardada na garagem."
    >
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList rotulo="Como identificar o veículo">
          <TabsTrigger value="placa">Pela placa</TabsTrigger>
          <TabsTrigger value="manual">Marca, modelo e ano</TabsTrigger>
        </TabsList>

        <TabsContent value="placa" className="pt-5">
          <form onSubmit={enviarPlaca} noValidate className="flex flex-col gap-4">
            <Input
              rotulo="Placa"
              value={placa}
              onChange={(e) => {
                setPlaca(mascaraPlaca(e.target.value));
                setErroPlaca("");
              }}
              erro={erroPlaca}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              placeholder="ABC1D23"
              className="font-mono text-[20px] font-bold tracking-[0.16em] uppercase"
            />
            <Button
              type="submit"
              Icone={Search}
              larguraCheia
              carregando={porPlaca.isPending}
            >
              Buscar e salvar
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="manual" className="pt-5">
          {avisoFallback && (
            <p
              role="status"
              className={cn(
                "mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning/35",
                "bg-warning-bg px-3 py-2.5 text-[13px] leading-snug text-warning"
              )}
            >
              <AlertTriangle aria-hidden className="mt-px size-4 shrink-0" />
              {avisoFallback}
            </p>
          )}

          <form onSubmit={enviarManual} noValidate className="flex flex-col gap-4">
            <Combobox
              rotulo="Marca"
              valor={marca}
              opcoes={marcas.data ?? []}
              onEscolher={(v) => {
                setMarca(v);
                setModelo("");
              }}
              carregando={marcas.isLoading}
              placeholder="Escolha a marca"
            />
            <Combobox
              rotulo="Modelo"
              valor={modelo}
              opcoes={nomesDeModelo(modelos.data ?? [])}
              onEscolher={setModelo}
              carregando={marca.length > 0 && modelos.isLoading}
              desabilitado={!marca}
              placeholder={marca ? "Escolha o modelo" : "Escolha a marca primeiro"}
              vazio="Nenhum modelo dessa marca na matriz ainda."
            />
            <SelectNativo
              rotulo="Ano"
              value={ano}
              onChange={(e) => {
                setAno(e.target.value);
                setErroManual("");
              }}
              erro={erroManual}
            >
              <option value="">Escolha o ano</option>
              {anosDoModelo(modelos.data ?? [], modelo).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectNativo>
            <Button type="submit" larguraCheia carregando={porDetalhes.isPending}>
              Salvar na garagem
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
