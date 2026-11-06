import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Lightbulb, Plus, Trash2, Warehouse } from "lucide-react";
import { ApiError } from "../api/client";
import { listVehicles, removeVehicle, type GarageVehicle } from "../api/vehicles";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { Button } from "../components/ui/Button";
import { Confirmacao } from "../components/ui/Dialog";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { DialogoNovoVeiculo } from "../features/garagem/DialogoNovoVeiculo";
import { cn } from "../lib/cn";

export default function Garagem() {
  const [adicionando, setAdicionando] = useState(false);
  const [removendo, setRemovendo] = useState<GarageVehicle | null>(null);
  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  const consulta = useQuery({
    queryKey: ["garagem"],
    queryFn: () => listVehicles().then((r) => r.vehicles),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removeVehicle(id),
    onSuccess: () => {
      toast.sucesso("Veículo removido da garagem.");
      void clienteDeConsulta.invalidateQueries({ queryKey: ["garagem"] });
      setRemovendo(null);
    },
    onError: (erro) =>
      toast.erro(
        "Não foi possível remover",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      ),
  });

  const veiculos = consulta.data ?? [];

  return (
    <>
      <SiteHeader />

      <main className="container-app py-8 lg:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-[clamp(1.5rem,3.8vw,2.1rem)] font-bold tracking-[-0.03em] text-ink">
              Minha garagem
            </h1>
            <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
              Seus veículos salvos. A placa não fica guardada aqui — só marca, modelo e ano.
            </p>
          </div>
          <Button Icone={Plus} onClick={() => setAdicionando(true)}>
            Adicionar veículo
          </Button>
        </header>

        {consulta.isLoading && (
          <div aria-busy className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        )}

        {consulta.isError && (
          <div
            role="alert"
            className="mt-6 rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
          >
            <h2 className="text-[15px] font-bold text-danger">
              Não conseguimos carregar a garagem
            </h2>
            <p className="mt-1.5 text-[13.5px] text-danger/90">
              {consulta.error instanceof ApiError
                ? consulta.error.message
                : "Tente novamente em instantes."}
            </p>
            <Button
              variante="secundario"
              className="mt-4"
              onClick={() => void consulta.refetch()}
            >
              Tentar de novo
            </Button>
          </div>
        )}

        {consulta.data && veiculos.length === 0 && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface p-10 text-center">
            <span
              aria-hidden
              className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600"
            >
              <Warehouse className="size-7" />
            </span>
            <h2 className="mt-5 text-lg font-bold tracking-[-0.015em] text-ink">
              Sua garagem está vazia
            </h2>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-[14px] leading-relaxed text-muted">
              Salve um veículo e a compatibilidade dele fica a um toque de distância, sem
              precisar digitar a placa de novo.
            </p>
            <Button className="mt-6" Icone={Plus} onClick={() => setAdicionando(true)}>
              Adicionar meu primeiro veículo
            </Button>
          </div>
        )}

        {veiculos.length > 0 && (
          <ul
            aria-label="Veículos salvos"
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {veiculos.map((veiculo) => (
              <li
                key={veiculo.id}
                className="flex min-w-0 flex-col rounded-[var(--radius-md)] border border-line bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand-50 text-brand-600"
                  >
                    <Car className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      title={`${veiculo.make} ${veiculo.model}`}
                      className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink"
                    >
                      {veiculo.make} {veiculo.model}
                    </h2>
                    <p data-numeros className="mt-0.5 text-[13px] text-muted">
                      Ano {veiculo.year}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemovendo(veiculo)}
                    aria-label={`Remover ${veiculo.make} ${veiculo.model} da garagem`}
                    className="shrink-0 rounded-[var(--radius-xs)] p-1.5 text-subtle transition-colors hover:bg-sunken hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>

                <Link
                  to={`/resultado?make=${encodeURIComponent(veiculo.make)}&model=${encodeURIComponent(veiculo.model)}&year=${veiculo.year}`}
                  className={cn(
                    "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)]",
                    "border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold text-ink",
                    "transition-colors hover:bg-sunken"
                  )}
                >
                  <Lightbulb aria-hidden className="size-4" />
                  Ver LEDs compatíveis
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />

      <DialogoNovoVeiculo aberto={adicionando} onFechar={() => setAdicionando(false)} />

      <Confirmacao
        aberto={Boolean(removendo)}
        onFechar={() => setRemovendo(null)}
        onConfirmar={() => removendo && remover.mutate(removendo.id)}
        titulo="Remover da garagem?"
        descricao={
          removendo ? (
            <>
              O {removendo.make} {removendo.model} {removendo.year} sai da sua garagem. Os
              pedidos que você já gerou continuam existindo.
            </>
          ) : null
        }
        rotuloConfirmar="Remover"
        destrutivo
        carregando={remover.isPending}
      />
    </>
  );
}
