import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { createLedModel, updateLedModel, type LedModel } from "../../../api/catalog";
import { ApiError } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input, SelectNativo } from "../../../components/ui/Field";
import { useToast } from "../../../components/ui/Toast";
import { centavosDoTexto, formatarPreco, textoDeCentavos } from "../../../lib/formato";
import { CampoImagem } from "./CampoImagem";

interface Props {
  aberto: boolean;
  /** Produto a editar; ausente significa criar um novo. */
  produto?: LedModel | null;
  onFechar: () => void;
}

interface Campos {
  sku: string;
  name: string;
  description: string;
  socketCode: string;
  unidades: string;
  preco: string;
  custo: string;
  stockQty: string;
  stockMin: string;
}

const VAZIO: Campos = {
  sku: "",
  name: "",
  description: "",
  socketCode: "",
  unidades: "2",
  preco: "",
  custo: "",
  stockQty: "0",
  stockMin: "5",
};

function inteiro(texto: string, padrao = 0): number {
  // Campo apagado tem que cair no padrao: `Number("")` e 0 e passaria no
  // isFinite, salvando minimo de alerta 0 e matando o aviso de reposicao.
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) {
    return padrao;
  }
  const n = Number(digitos);
  return Number.isSafeInteger(n) ? n : padrao;
}

export function DialogoProduto({ aberto, produto, onFechar }: Props) {
  const editando = Boolean(produto);
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [imagem, setImagem] = useState<string | null>(null);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});

  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  // Reabrir com outro produto precisa recarregar o formulário.
  useEffect(() => {
    if (!aberto) {
      return;
    }
    if (produto) {
      setCampos({
        sku: produto.sku,
        name: produto.name,
        description: produto.description ?? "",
        socketCode: produto.socketCode,
        unidades: String(produto.unitsPerKit),
        preco: textoDeCentavos(produto.priceCents),
        custo: textoDeCentavos(produto.costCents),
        stockQty: String(produto.stockQty),
        stockMin: String(produto.stockMin),
      });
      setImagem(produto.imageUrl);
    } else {
      setCampos(VAZIO);
      setImagem(null);
    }
    setErros({});
  }, [aberto, produto]);

  const salvar = useMutation({
    mutationFn: () => {
      const priceCents = campos.preco.trim() ? centavosDoTexto(campos.preco) : null;
      const costCents = campos.custo.trim() ? centavosDoTexto(campos.custo) : null;

      if (produto) {
        return updateLedModel(produto.id, {
          name: campos.name.trim(),
          description: campos.description.trim() || null,
          socketCode: campos.socketCode.trim(),
          unitsPerKit: inteiro(campos.unidades, 2) || 2,
          imageUrl: imagem,
          priceCents,
          costCents,
          stockMin: inteiro(campos.stockMin, 5),
        }).then((r) => r.ledModel);
      }

      return createLedModel({
        sku: campos.sku.trim(),
        name: campos.name.trim(),
        description: campos.description.trim() || undefined,
        socketCode: campos.socketCode.trim(),
        unitsPerKit: inteiro(campos.unidades, 2) || 2,
        imageUrl: imagem,
        priceCents,
        costCents,
        stockQty: inteiro(campos.stockQty),
        stockMin: inteiro(campos.stockMin, 5),
      }).then((r) => r.ledModel);
    },
    onSuccess: (ledModel) => {
      toast.sucesso(
        editando ? "Produto atualizado." : "Produto criado.",
        `${ledModel.name} está no catálogo.`
      );
      void clienteDeConsulta.invalidateQueries({ queryKey: ["catalogo"] });
      onFechar();
    },
    onError: (erro) => {
      // 409 é SKU duplicado: pertence ao campo, não ao formulário inteiro.
      if (erro instanceof ApiError && erro.status === 409) {
        setErros({ sku: erro.message });
        return;
      }
      toast.erro(
        editando ? "Não foi possível salvar" : "Não foi possível criar",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      );
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos: Partial<Record<keyof Campos, string>> = {};

    if (!campos.name.trim()) {
      novos.name = "Informe o nome do produto.";
    }
    if (!editando && !campos.sku.trim()) {
      novos.sku = "Informe o SKU.";
    }
    if (!campos.socketCode.trim()) {
      novos.socketCode = "Informe o código do encaixe.";
    }
    for (const campo of ["preco", "custo"] as const) {
      if (campos[campo].trim() && centavosDoTexto(campos[campo]) === null) {
        novos[campo] = "Use um valor como 129,90.";
      }
    }

    setErros(novos);
    if (Object.keys(novos).length === 0) {
      salvar.mutate();
    }
  }

  const margem = (() => {
    const preco = centavosDoTexto(campos.preco);
    const custo = centavosDoTexto(campos.custo);
    if (preco === null || custo === null || preco === 0) {
      return null;
    }
    return { valor: formatarPreco(preco - custo), pct: Math.round(((preco - custo) / preco) * 100) };
  })();

  function mudar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  return (
    <Dialog
      largo
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? "Editar produto" : "Novo produto no catálogo"}
      descricao={
        editando
          ? "O SKU não muda: ele é a chave do produto no catálogo."
          : "O encaixe é o que liga o produto às posições de farol compatíveis."
      }
      rodape={
        <>
          <Button variante="secundario" onClick={onFechar} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button form="form-produto" type="submit" carregando={salvar.isPending}>
            {editando ? "Salvar alterações" : "Criar produto"}
          </Button>
        </>
      }
    >
      <form id="form-produto" noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <Input
          rotulo="Nome"
          placeholder="Ultraled Infinity H4"
          value={campos.name}
          onChange={(e) => mudar("name", e.target.value)}
          erro={erros.name}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            rotulo="SKU"
            placeholder="SLL-140004"
            autoCapitalize="characters"
            className="font-mono"
            value={campos.sku}
            disabled={editando}
            dica={editando ? "Não pode ser alterado." : undefined}
            onChange={(e) => mudar("sku", e.target.value)}
            erro={erros.sku}
          />
          <Input
            rotulo="Encaixe"
            placeholder="H4"
            autoCapitalize="characters"
            className="font-mono"
            value={campos.socketCode}
            onChange={(e) => mudar("socketCode", e.target.value)}
            dica="Código do soquete."
            erro={erros.socketCode}
          />
        </div>

        <Input
          rotulo="Descrição"
          placeholder="90W / 15000lm / 6500K"
          value={campos.description}
          onChange={(e) => mudar("description", e.target.value)}
          dica="Opcional. Potência, lúmens e temperatura de cor, por exemplo."
        />

        <SelectNativo
          rotulo="O que vem no kit"
          value={campos.unidades}
          onChange={(e) => mudar("unidades", e.target.value)}
          dica="A linha vem em par; torpedo é vendido avulso."
        >
          <option value="2">Par — 2 lâmpadas, uma para cada lado</option>
          <option value="1">Unidade — 1 lâmpada (torpedo)</option>
          <option value="4">Jogo — 4 lâmpadas</option>
        </SelectNativo>

        <CampoImagem valor={imagem} onMudar={setImagem} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            rotulo="Preço de venda"
            inputMode="decimal"
            placeholder="129,90"
            prefixo={<span className="text-[13px] font-semibold">R$</span>}
            value={campos.preco}
            onChange={(e) => mudar("preco", e.target.value)}
            dica="O cliente vê este valor."
            erro={erros.preco}
          />
          <Input
            rotulo="Custo (interno)"
            inputMode="decimal"
            placeholder="74,50"
            prefixo={<span className="text-[13px] font-semibold">R$</span>}
            value={campos.custo}
            onChange={(e) => mudar("custo", e.target.value)}
            dica="Só você e o representante veem."
            erro={erros.custo}
          />
        </div>

        {margem && (
          <p className="rounded-[var(--radius-sm)] border border-line bg-sunken px-3 py-2.5 text-[13px] text-muted">
            Margem do kit:{" "}
            <strong data-numeros className="font-semibold text-ink">
              {margem.valor}
            </strong>{" "}
            <span data-numeros>({margem.pct}%)</span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!editando && (
            <Input
              rotulo="Quantidade inicial"
              inputMode="numeric"
              value={campos.stockQty}
              onChange={(e) => mudar("stockQty", e.target.value)}
            />
          )}
          <Input
            rotulo="Mínimo de alerta"
            inputMode="numeric"
            value={campos.stockMin}
            onChange={(e) => mudar("stockMin", e.target.value)}
            dica="Abaixo disso o produto entra em estoque crítico."
          />
        </div>
      </form>
    </Dialog>
  );
}
