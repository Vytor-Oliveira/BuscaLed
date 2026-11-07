import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LightingPosition } from "../../api/compatibility";

export interface VeiculoDoCarrinho {
  make: string;
  model: string;
  year: number;
}

export interface ItemDoCarrinho {
  ledModelId: string;
  position: LightingPosition;
  sku: string;
  nome: string;
  socketCode: string;
  imageUrl: string | null;
  /** Centavos, no momento da escolha. Nulo quando o produto não tem preço. */
  precoCents: number | null;
  /** Lâmpadas por kit no momento da escolha: 2 é o par, 1 é torpedo. */
  unidadesPorKit: number;
  quantidade: number;
}

interface Carrinho {
  veiculo: VeiculoDoCarrinho | null;
  itens: ItemDoCarrinho[];
}

interface Contexto extends Carrinho {
  total: number;
  /** Soma em centavos dos itens que têm preço. */
  totalCents: number;
  /** Verdadeiro quando algum item ficou sem preço cadastrado. */
  temItemSemPreco: boolean;
  definirVeiculo: (veiculo: VeiculoDoCarrinho) => void;
  /** Uma posição comporta um modelo por vez: escolher outro substitui. */
  escolher: (item: ItemDoCarrinho) => void;
  remover: (position: LightingPosition) => void;
  ajustarQuantidade: (position: LightingPosition, quantidade: number) => void;
  escolhidoEm: (position: LightingPosition) => ItemDoCarrinho | undefined;
  limpar: () => void;
}

const CarrinhoContext = createContext<Contexto | null>(null);

// sessionStorage e não localStorage: a seleção é de uma visita. E o veículo
// guardado aqui é marca/modelo/ano — a placa nunca entra (RN02).
const CHAVE = "buscaled:reserva";

function ler(): Carrinho {
  try {
    const cru = sessionStorage.getItem(CHAVE);
    if (!cru) {
      return { veiculo: null, itens: [] };
    }
    const dados = JSON.parse(cru) as Partial<Carrinho>;
    return {
      veiculo: dados.veiculo ?? null,
      itens: Array.isArray(dados.itens) ? dados.itens : [],
    };
  } catch {
    return { veiculo: null, itens: [] };
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [carrinho, setCarrinho] = useState<Carrinho>(ler);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(carrinho));
    } catch {
      // Storage bloqueado: a seleção vive só em memória nesta aba.
    }
  }, [carrinho]);

  const definirVeiculo = useCallback((veiculo: VeiculoDoCarrinho) => {
    setCarrinho((atual) => {
      const mesmo =
        atual.veiculo?.make === veiculo.make &&
        atual.veiculo?.model === veiculo.model &&
        atual.veiculo?.year === veiculo.year;
      // Trocar de carro zera a seleção: encaixe de um não vale para o outro.
      return mesmo ? { ...atual, veiculo } : { veiculo, itens: [] };
    });
  }, []);

  const escolher = useCallback((item: ItemDoCarrinho) => {
    setCarrinho((atual) => ({
      ...atual,
      itens: [...atual.itens.filter((i) => i.position !== item.position), item],
    }));
  }, []);

  const remover = useCallback((position: LightingPosition) => {
    setCarrinho((atual) => ({
      ...atual,
      itens: atual.itens.filter((i) => i.position !== position),
    }));
  }, []);

  const ajustarQuantidade = useCallback((position: LightingPosition, quantidade: number) => {
    const limitada = Math.min(20, Math.max(1, Math.round(quantidade)));
    setCarrinho((atual) => ({
      ...atual,
      itens: atual.itens.map((i) =>
        i.position === position ? { ...i, quantidade: limitada } : i
      ),
    }));
  }, []);

  const limpar = useCallback(() => {
    setCarrinho({ veiculo: null, itens: [] });
    try {
      sessionStorage.removeItem(CHAVE);
    } catch {
      // Nada a fazer: o estado em memória já foi zerado.
    }
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      ...carrinho,
      total: carrinho.itens.reduce((soma, i) => soma + i.quantidade, 0),
      totalCents: carrinho.itens.reduce(
        (soma, i) => soma + (i.precoCents ?? 0) * i.quantidade,
        0
      ),
      temItemSemPreco: carrinho.itens.some((i) => i.precoCents === null),
      definirVeiculo,
      escolher,
      remover,
      ajustarQuantidade,
      escolhidoEm: (position) => carrinho.itens.find((i) => i.position === position),
      limpar,
    }),
    [carrinho, definirVeiculo, escolher, remover, ajustarQuantidade, limpar]
  );

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho(): Contexto {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) {
    throw new Error("useCarrinho precisa estar dentro de <CarrinhoProvider>.");
  }
  return ctx;
}
