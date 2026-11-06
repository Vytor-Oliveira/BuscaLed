import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  CarFront,
  PackageCheck,
  PackageX,
  Plus,
  SearchX,
  Warehouse,
} from "lucide-react";
import { ApiError } from "../api/client";
import { buscarCompatibilidade, type PositionCompatibility } from "../api/compatibility";
import { addVehicleByDetails } from "../api/vehicles";
import { useAuth } from "../auth/AuthContext";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { CartaoPosicao } from "../features/resultado/CartaoPosicao";
import { ResumoReserva } from "../features/resultado/ResumoReserva";
import { useCarrinho } from "../features/reserva/CarrinhoContext";
import {
  explicacaoDoKit,
  META_POSICAO,
  ROTULO_POSICAO,
  ordenarPosicoes,
} from "../lib/posicoes";
import { cn } from "../lib/cn";

function Esqueleto() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Skeleton className="size-10 rounded-[var(--radius-sm)]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Resultado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { definirVeiculo, veiculo } = useCarrinho();

  const make = params.get("make") ?? "";
  const model = params.get("model") ?? "";
  const year = Number(params.get("year") ?? "");
  const parametrosOk = Boolean(make && model && Number.isFinite(year) && year > 1900);

  // Entrar por link direto também precisa encher o carrinho com o veículo.
  useEffect(() => {
    if (parametrosOk) {
      definirVeiculo({ make, model, year });
    }
  }, [parametrosOk, make, model, year, definirVeiculo]);

  const consulta = useQuery({
    queryKey: ["compatibilidade", make, model, year],
    queryFn: () => buscarCompatibilidade(make, model, year).then((r) => r.positions),
    enabled: parametrosOk,
  });

  const salvar = useMutation({
    mutationFn: () => addVehicleByDetails(make, model, year),
    onSuccess: () => toast.sucesso("Veículo salvo na garagem."),
    onError: (erro) =>
      toast.erro(
        "Não foi possível salvar",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      ),
  });

  const { comProduto, semProduto } = useMemo(() => {
    const posicoes = ordenarPosicoes(consulta.data ?? []);
    return {
      comProduto: posicoes.filter((p) => p.models.length > 0),
      semProduto: posicoes.filter((p) => p.models.length === 0),
    };
  }, [consulta.data]);

  if (!parametrosOk) {
    return (
      <>
        <SiteHeader />
        <main className="container-app grid min-h-[60vh] place-items-center py-16">
          <div className="max-w-md text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-sunken text-subtle">
              <SearchX aria-hidden className="size-7" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">
              Faltou dizer qual carro
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Este endereço precisa de marca, modelo e ano. Volte e informe o veículo.
            </p>
            <Button className="mt-6" onClick={() => navigate("/")} Icone={ArrowLeft}>
              Buscar meu veículo
            </Button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const naoCadastrado = consulta.error instanceof ApiError && consulta.error.status === 404;
  // Sem posição alguma não há o que escolher, então o trilho da reserva sai da
  // tela em vez de instruir algo impossível.
  const temPosicoes = comProduto.length > 0;
  const modelosListados = comProduto.flatMap((p) => p.models);
  // O aviso geral só pode falar um número: ele vale quando toda a lista traz a
  // mesma quantidade por kit. Misturar par e jogo (ou torpedo) deixa a verdade
  // para o rótulo de cada produto.
  const unidades = new Set(modelosListados.map((m) => m.unitsPerKit));
  const unidadesDoAviso = unidades.size === 1 ? [...unidades][0] : null;

  return (
    <>
      <SiteHeader />

      <main className="container-app py-8 lg:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Trocar de veículo
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="flex min-w-0 gap-3.5">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-600 text-accent-400"
            >
              <CarFront className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[clamp(1.4rem,3.6vw,1.9rem)] font-bold leading-tight tracking-[-0.025em] text-ink">
                {make} {model}
              </h1>
              <p data-numeros className="mt-1 text-[14px] text-muted">
                Ano {year}
                {consulta.data && (
                  <>
                    {" · "}
                    {comProduto.length} de {consulta.data.length}{" "}
                    {consulta.data.length === 1 ? "posição" : "posições"} com LED no catálogo
                  </>
                )}
              </p>
            </div>
          </div>

          {user && (
            <Button
              variante="secundario"
              Icone={Warehouse}
              carregando={salvar.isPending}
              disabled={salvar.isSuccess}
              onClick={() => salvar.mutate()}
            >
              {salvar.isSuccess ? "Salvo na garagem" : "Salvar na garagem"}
            </Button>
          )}
        </header>

        <div
          className={cn(
            "mt-7 grid gap-7 lg:items-start lg:gap-8",
            temPosicoes && "lg:grid-cols-[1fr_20rem]"
          )}
        >
          <div className="min-w-0">
            {consulta.isLoading && <Esqueleto />}

            {naoCadastrado && (
              <div className="rounded-[var(--radius-md)] border border-line bg-surface p-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-warning-bg text-warning">
                  <PackageX aria-hidden className="size-7" />
                </span>
                <h2 className="mt-5 text-xl font-bold tracking-[-0.02em] text-ink">
                  Ainda não temos esse veículo na matriz
                </h2>
                <p className="mx-auto mt-2 max-w-[48ch] text-[14.5px] leading-relaxed text-muted">
                  O {make} {model} {year} não está cadastrado. Isso não quer dizer que não
                  exista LED para ele — quer dizer que a matriz de aplicação ainda não cobre
                  esse ano ou essa versão.
                </p>
                <Button className="mt-6" onClick={() => navigate("/")} Icone={ArrowLeft}>
                  Tentar outro veículo
                </Button>
              </div>
            )}

            {consulta.isError && !naoCadastrado && (
              <div
                role="alert"
                className="rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
              >
                <h2 className="text-[16px] font-bold text-danger">
                  Não conseguimos carregar a compatibilidade
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-danger/90">
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

            {consulta.data && (
              <div className="flex flex-col gap-4">
                {/* O cliente leigo precisa saber disso antes de escolher a
                    quantidade, nao depois de receber o dobro do que queria. */}
                {unidadesDoAviso !== null && unidadesDoAviso >= 2 && (
                  <p className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-brand-200 bg-brand-50 px-3.5 py-3 text-[13px] leading-snug text-brand-700">
                    <PackageCheck aria-hidden className="mt-px size-4 shrink-0" />
                    {explicacaoDoKit(unidadesDoAviso)}
                  </p>
                )}

                {comProduto.map((posicao: PositionCompatibility) => (
                  <CartaoPosicao key={posicao.position} dados={posicao} />
                ))}

                {/* A lacuna é informação: aparece recolhida, nunca escondida. */}
                {semProduto.length > 0 && (
                  <details className="group rounded-[var(--radius-md)] border border-line bg-sunken">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-ink">
                          {semProduto.length}{" "}
                          {semProduto.length === 1 ? "posição existe" : "posições existem"} no
                          seu carro, mas ainda sem LED no catálogo
                        </span>
                        <span className="mt-0.5 block text-[13px] text-muted">
                          Mostramos de propósito: o encaixe existe, o produto é que falta.
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-transform duration-[var(--dur)] ease-(--ease-out-expo) group-open:rotate-45"
                      >
                        <Plus className="size-3.5" />
                      </span>
                    </summary>
                    <ul className="flex flex-col gap-px border-t border-line bg-line">
                      {semProduto.map((posicao) => {
                        const { icone: Icone } = META_POSICAO[posicao.position];
                        return (
                          <li
                            key={posicao.position}
                            className="flex items-center gap-3 bg-surface px-4 py-3"
                          >
                            <Icone aria-hidden className="size-4.5 shrink-0 text-subtle" />
                            <span className="flex-1 text-[14px] font-medium text-ink">
                              {ROTULO_POSICAO[posicao.position]}
                            </span>
                            <span
                              data-numeros
                              className="font-mono text-[12px] font-semibold text-muted"
                            >
                              {posicao.socketCodes.join(" ou ") || "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          {temPosicoes && <ResumoReserva veiculo={veiculo} />}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
