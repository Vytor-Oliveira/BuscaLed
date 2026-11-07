import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { restock, type LedModel } from "../../../api/catalog";
import { ApiError } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Field";
import { useToast } from "../../../components/ui/Toast";

const ATALHOS = [10, 50, 100];

export function DialogoReposicao({
  produto,
  onFechar,
}: {
  produto: LedModel | null;
  onFechar: () => void;
}) {
  const [quantidade, setQuantidade] = useState(10);
  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  const repor = useMutation({
    mutationFn: () => restock(produto!.id, quantidade),
    onSuccess: ({ stock }) => {
      toast.sucesso(
        "Estoque reposto.",
        `${produto?.name} agora tem ${stock.stockQty} unidades.`
      );
      void clienteDeConsulta.invalidateQueries({ queryKey: ["catalogo"] });
      void clienteDeConsulta.invalidateQueries({ queryKey: ["demanda"] });
      fechar();
    },
    onError: (erro) =>
      toast.erro(
        "Não foi possível repor",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      ),
  });

  function fechar() {
    setQuantidade(10);
    onFechar();
  }

  return (
    <Dialog
      aberto={Boolean(produto)}
      onFechar={fechar}
      titulo="Repor estoque"
      descricao={
        produto ? (
          <>
            <strong className="font-semibold text-ink">{produto.name}</strong> tem hoje{" "}
            <span data-numeros>{produto.stockQty}</span> unidades, com mínimo de{" "}
            <span data-numeros>{produto.stockMin}</span>.
          </>
        ) : undefined
      }
      rodape={
        <>
          <Button variante="secundario" onClick={fechar} disabled={repor.isPending}>
            Cancelar
          </Button>
          <Button carregando={repor.isPending} onClick={() => repor.mutate()}>
            Adicionar {quantidade} un.
          </Button>
        </>
      }
    >
      <div className="flex items-end gap-2">
        <Button
          variante="secundario"
          aria-label="Diminuir quantidade"
          disabled={quantidade <= 1}
          onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          className="mb-px size-11 shrink-0 px-0"
        >
          <Minus aria-hidden className="size-4" />
        </Button>

        <Input
          rotulo="Quantidade a adicionar"
          type="number"
          min={1}
          max={9999}
          inputMode="numeric"
          value={quantidade}
          onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
          className="text-center text-[18px] font-bold"
        />

        <Button
          variante="secundario"
          aria-label="Aumentar quantidade"
          onClick={() => setQuantidade((q) => q + 1)}
          className="mb-px size-11 shrink-0 px-0"
        >
          <Plus aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ATALHOS.map((atalho) => (
          <Button
            key={atalho}
            variante="secundario"
            tamanho="sm"
            onClick={() => setQuantidade(atalho)}
          >
            {atalho} un.
          </Button>
        ))}
      </div>

      {produto && (
        <p className="mt-4 text-[13px] text-muted">
          Depois de repor, o estoque fica em{" "}
          <strong data-numeros className="font-semibold text-ink">
            {produto.stockQty + quantidade}
          </strong>{" "}
          unidades.
        </p>
      )}
    </Dialog>
  );
}
