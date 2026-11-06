import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ImageOff, PackagePlus, PackageSearch, Pencil, Plus, SearchX } from "lucide-react";
import { listLedModels, type LedModel } from "../api/catalog";
import { ApiError } from "../api/client";
import { Badge, type TomBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SelectNativo } from "../components/ui/Field";
import { Skeleton } from "../components/ui/Skeleton";
import { DialogoProduto } from "../features/painel/estoque/DialogoProduto";
import { DialogoReposicao } from "../features/painel/estoque/DialogoReposicao";
import { formatarInteiro, formatarPreco } from "../lib/formato";
import { cn } from "../lib/cn";

type Situacao = "todos" | "ok" | "baixo" | "esgotado";
type Ordem = "nome" | "menor-estoque" | "maior-estoque";

function situacaoDe(produto: LedModel): Exclude<Situacao, "todos"> {
  if (produto.stockQty === 0) {
    return "esgotado";
  }
  return produto.stockQty <= produto.stockMin ? "baixo" : "ok";
}

const SELO: Record<Exclude<Situacao, "todos">, { tom: TomBadge; rotulo: string }> = {
  ok: { tom: "success", rotulo: "Em estoque" },
  baixo: { tom: "warning", rotulo: "Abaixo do mínimo" },
  esgotado: { tom: "danger", rotulo: "Esgotado" },
};

function BarraDeEstoque({ produto }: { produto: LedModel }) {
  const situacao = situacaoDe(produto);
  // A escala é o dobro do mínimo: é a referência que diz se está perto da linha.
  const escala = Math.max(produto.stockMin * 2, produto.stockQty, 1);
  const largura = Math.min(100, (produto.stockQty / escala) * 100);
  const marca = Math.min(100, (produto.stockMin / escala) * 100);

  return (
    <div className="min-w-32">
      <div className="relative h-2 overflow-hidden rounded-full bg-sunken">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            situacao === "esgotado"
              ? "bg-danger"
              : situacao === "baixo"
                ? "bg-warning"
                : "bg-success"
          )}
          style={{ width: `${largura}%` }}
        />
        {/* O mínimo é uma marca de referência, não uma segunda série. */}
        {produto.stockMin > 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-ink/45"
            style={{ left: `${marca}%` }}
          />
        )}
      </div>
      <p data-numeros className="mt-1 text-[12px] text-muted">
        {formatarInteiro(produto.stockQty)} un. · mínimo {formatarInteiro(produto.stockMin)}
      </p>
    </div>
  );
}

export default function Stock() {
  const [termo, setTermo] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todos");
  const [encaixe, setEncaixe] = useState("todos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [repondo, setRepondo] = useState<LedModel | null>(null);
  // null = diálogo fechado; produto = editando; "novo" = criando.
  const [emEdicao, setEmEdicao] = useState<LedModel | "novo" | null>(null);

  const consulta = useQuery({
    queryKey: ["catalogo"],
    queryFn: () => listLedModels().then((r) => r.ledModels),
  });

  // Memoizado para não recriar a lista a cada render e invalidar os useMemo
  // de resumo, encaixes e filtro.
  const todos = useMemo(() => consulta.data ?? [], [consulta.data]);

  const encaixes = useMemo(
    () => [...new Set(todos.map((p) => p.socketCode))].sort((a, b) => a.localeCompare(b)),
    [todos]
  );

  const resumo = useMemo(
    () => ({
      total: todos.length,
      baixo: todos.filter((p) => situacaoDe(p) === "baixo").length,
      esgotado: todos.filter((p) => situacaoDe(p) === "esgotado").length,
    }),
    [todos]
  );

  const visiveis = useMemo(() => {
    const alvo = termo.trim().toLowerCase();
    return todos
      .filter(
        (p) =>
          !alvo ||
          p.name.toLowerCase().includes(alvo) ||
          p.sku.toLowerCase().includes(alvo)
      )
      .filter((p) => situacao === "todos" || situacaoDe(p) === situacao)
      .filter((p) => encaixe === "todos" || p.socketCode === encaixe)
      .sort((a, b) => {
        if (ordem === "menor-estoque") {
          return a.stockQty - b.stockQty;
        }
        if (ordem === "maior-estoque") {
          return b.stockQty - a.stockQty;
        }
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [todos, termo, situacao, encaixe, ordem]);

  const filtrando = Boolean(termo) || situacao !== "todos" || encaixe !== "todos";

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Resumo do catálogo" className="grid gap-3 sm:grid-cols-3">
        {[
          { rotulo: "Produtos no catálogo", valor: resumo.total },
          { rotulo: "Em alerta", valor: resumo.baixo },
          { rotulo: "Esgotados", valor: resumo.esgotado },
        ].map(({ rotulo, valor }) => (
          <div key={rotulo} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
              {rotulo}
            </p>
            {consulta.isLoading ? (
              <Skeleton className="mt-2 h-7 w-14" />
            ) : (
              <p
                data-numeros
                className="mt-1.5 text-[1.7rem] font-bold leading-none tracking-[-0.02em] text-ink"
              >
                {formatarInteiro(valor)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar por nome ou SKU
          </label>
          <input
            id="busca-catalogo"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome ou SKU…"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-subtle"
          />
        </div>

        <div className="w-full sm:w-52">
          <SelectNativo
            rotulo="Filtrar por situação"
            rotuloOculto
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as Situacao)}
          >
            <option value="todos">Todas as situações</option>
            <option value="ok">Em estoque</option>
            <option value="baixo">Abaixo do mínimo</option>
            <option value="esgotado">Esgotados</option>
          </SelectNativo>
        </div>

        <div className="w-full sm:w-48">
          <SelectNativo
            rotulo="Filtrar por encaixe"
            rotuloOculto
            value={encaixe}
            onChange={(e) => setEncaixe(e.target.value)}
          >
            <option value="todos">Todos os encaixes</option>
            {encaixes.map((codigo) => (
              <option key={codigo} value={codigo}>
                {codigo}
              </option>
            ))}
          </SelectNativo>
        </div>

        <div className="w-full sm:w-48">
          <SelectNativo
            rotulo="Ordenar o catálogo"
            rotuloOculto
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
          >
            <option value="nome">Nome (A–Z)</option>
            <option value="menor-estoque">Menor estoque</option>
            <option value="maior-estoque">Maior estoque</option>
          </SelectNativo>
        </div>

        <Button Icone={PackagePlus} onClick={() => setEmEdicao("novo")} className="sm:ml-auto">
          Novo produto
        </Button>
      </div>

      {consulta.isLoading && (
        <div aria-busy className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {consulta.isError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
        >
          <h2 className="text-[15px] font-bold text-danger">
            Não conseguimos carregar o catálogo
          </h2>
          <p className="mt-1.5 text-[13.5px] text-danger/90">
            {consulta.error instanceof ApiError
              ? consulta.error.message
              : "Tente novamente em instantes."}
          </p>
          <Button variante="secundario" className="mt-4" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {consulta.data && visiveis.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface p-10 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-14 place-items-center rounded-full bg-sunken text-subtle"
          >
            {filtrando ? <SearchX className="size-7" /> : <PackageSearch className="size-7" />}
          </span>
          <h2 className="mt-5 text-lg font-bold tracking-[-0.015em] text-ink">
            {filtrando ? "Nenhum produto com esses filtros" : "O catálogo está vazio"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-muted">
            {filtrando
              ? "Limpe a busca ou troque a situação e o encaixe."
              : "Cadastre o primeiro produto para que ele apareça nas buscas de compatibilidade."}
          </p>
          {!filtrando && (
            <Button className="mt-6" Icone={Plus} onClick={() => setEmEdicao("novo")}>
              Cadastrar produto
            </Button>
          )}
        </div>
      )}

      {visiveis.length > 0 && (
        <ul aria-label="Produtos do catálogo" className="flex flex-col gap-2">
          {visiveis.map((produto) => {
            const { tom, rotulo } = SELO[situacaoDe(produto)];
            return (
              <li
                key={produto.id}
                className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-line bg-surface p-4"
              >
                {produto.imageUrl ? (
                  <img
                    src={produto.imageUrl}
                    alt={`Foto do ${produto.name}`}
                    loading="lazy"
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white object-contain p-1"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong bg-sunken text-subtle"
                  >
                    <ImageOff className="size-5" />
                  </span>
                )}

                <div className="min-w-40 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink">{produto.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                    <span data-numeros className="font-mono">
                      {produto.sku}
                    </span>
                    <span aria-hidden>·</span>
                    <span data-numeros className="font-mono">
                      encaixe {produto.socketCode}
                    </span>
                  </p>
                </div>

                <div className="min-w-28">
                  <p data-numeros className="text-[14px] font-bold text-ink">
                    {formatarPreco(produto.priceCents) ?? (
                      <span className="font-normal text-subtle">sem preço</span>
                    )}
                  </p>
                  {produto.costCents !== null && (
                    // Só o admin chega nesta tela (RN06), então o custo pode
                    // aparecer aqui — mas nunca em rota pública.
                    <p data-numeros className="mt-0.5 text-[12px] text-muted">
                      custo {formatarPreco(produto.costCents)}
                    </p>
                  )}
                </div>

                <BarraDeEstoque produto={produto} />

                <Badge tom={tom}>{rotulo}</Badge>

                <div className="flex gap-2">
                  <Button
                    variante="secundario"
                    tamanho="sm"
                    Icone={Pencil}
                    aria-label={`Editar ${produto.name}`}
                    onClick={() => setEmEdicao(produto)}
                  >
                    Editar
                  </Button>
                  <Button variante="secundario" tamanho="sm" onClick={() => setRepondo(produto)}>
                    Repor
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogoReposicao produto={repondo} onFechar={() => setRepondo(null)} />
      <DialogoProduto
        aberto={emEdicao !== null}
        produto={emEdicao === "novo" ? null : emEdicao}
        onFechar={() => setEmEdicao(null)}
      />
    </div>
  );
}
