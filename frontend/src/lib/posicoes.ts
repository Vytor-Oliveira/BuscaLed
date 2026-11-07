import {
  Circle,
  CircleDot,
  CloudFog,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Disc,
  LampCeiling,
  Lightbulb,
  RectangleHorizontal,
  Sun,
  Sunrise,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { ROTULO_POSICAO, type LightingPosition } from "../api/compatibility";

export { ROTULO_POSICAO };
export type { LightingPosition };

type Grupo = "dianteira" | "traseira" | "interna";

interface Metadados {
  icone: LucideIcon;
  grupo: Grupo;
  /** Posicao que existe em par no carro: a quantidade padrao é 2. */
  emPar: boolean;
  /** Explicacao em linguagem de motorista, nao de catalogo. */
  explicacao: string;
}

export const META_POSICAO: Record<LightingPosition, Metadados> = {
  FAROL_BAIXO: {
    icone: Lightbulb,
    grupo: "dianteira",
    emPar: true,
    explicacao: "A luz que você usa na cidade e na chuva, apontada para baixo.",
  },
  FAROL_ALTO: {
    icone: Sun,
    grupo: "dianteira",
    emPar: true,
    explicacao: "O farol alto, de estrada escura e sem movimento à frente.",
  },
  NEBLINA: {
    icone: CloudFog,
    grupo: "dianteira",
    emPar: true,
    explicacao: "O par de baixo do para-choque, que abre o caminho na névoa.",
  },
  LANTERNA_DIANTEIRA: {
    icone: CircleDot,
    grupo: "dianteira",
    emPar: true,
    explicacao: "A luzinha de posição da frente, que mostra onde o carro está.",
  },
  PISCA_DIANTEIRO: {
    icone: CornerUpRight,
    grupo: "dianteira",
    emPar: true,
    explicacao: "A seta da frente.",
  },
  PISCA_LATERAL: {
    icone: CornerDownRight,
    grupo: "dianteira",
    emPar: true,
    explicacao: "A seta repetida na lateral, perto do paralama ou do retrovisor.",
  },
  LANTERNA_TRASEIRA: {
    icone: Circle,
    grupo: "traseira",
    emPar: true,
    explicacao: "A luz vermelha de trás que fica acesa junto com o farol.",
  },
  PISCA_TRASEIRO: {
    icone: CornerUpLeft,
    grupo: "traseira",
    emPar: true,
    explicacao: "A seta de trás.",
  },
  LUZ_FREIO: {
    icone: Disc,
    grupo: "traseira",
    emPar: true,
    explicacao: "Acende mais forte quando você pisa no freio.",
  },
  RE: {
    icone: Undo2,
    grupo: "traseira",
    emPar: true,
    explicacao: "A luz branca que acende na marcha a ré.",
  },
  PLACA: {
    icone: RectangleHorizontal,
    grupo: "traseira",
    emPar: false,
    explicacao: "Ilumina a placa traseira. Normalmente uma ou duas lâmpadas pequenas.",
  },
  TETO: {
    icone: LampCeiling,
    grupo: "interna",
    emPar: false,
    explicacao: "A luz de dentro do carro, no teto.",
  },
  DRL: {
    icone: Sunrise,
    grupo: "dianteira",
    emPar: true,
    explicacao: "Luz diurna: fica acesa de dia só para o carro ser visto.",
  },
};

export const ROTULO_GRUPO: Record<Grupo, string> = {
  dianteira: "Frente",
  traseira: "Traseira",
  interna: "Interior",
};

/** Ordem de leitura: frente, traseira, interior — e dentro disso, a do carro. */
export const ORDEM_POSICAO: LightingPosition[] = [
  "FAROL_BAIXO",
  "FAROL_ALTO",
  "DRL",
  "NEBLINA",
  "LANTERNA_DIANTEIRA",
  "PISCA_DIANTEIRO",
  "PISCA_LATERAL",
  "LANTERNA_TRASEIRA",
  "LUZ_FREIO",
  "PISCA_TRASEIRO",
  "RE",
  "PLACA",
  "TETO",
];

export function ordenarPosicoes<T extends { position: LightingPosition }>(itens: T[]): T[] {
  const peso = (p: LightingPosition) => {
    const i = ORDEM_POSICAO.indexOf(p);
    return i === -1 ? ORDEM_POSICAO.length : i;
  };
  return [...itens].sort((a, b) => peso(a.position) - peso(b.position));
}

/**
 * Sempre 1. O produto da Shocklight e vendido como kit, e o kit ja traz o par
 * de lampadas — pedir 2 para uma posicao em par daria quatro lampadas. O
 * `emPar` continua existindo para explicar isso ao cliente, nao para
 * multiplicar a quantidade.
 */
export function quantidadePadrao(_position: LightingPosition): number {
  return 1;
}

/**
 * O que o cliente recebe ao pedir uma unidade. Depende do produto: a linha
 * vem em par, mas torpedo é vendido avulso — por isso o texto sai do dado e
 * não de uma frase fixa.
 */
export function explicacaoDoKit(unidades: number): string {
  return unidades >= 2
    ? `Cada kit já vem com ${unidades} lâmpadas — uma para cada lado do carro. Uma unidade atende a posição inteira.`
    : "Este produto é vendido por unidade: cada pedido traz uma lâmpada.";
}

/** Rótulo curto ao lado do preço. */
export function rotuloDoKit(unidades: number): string {
  return unidades >= 2 ? "o kit (par)" : "a unidade";
}

/** Texto do tooltip que explica "encaixe" sem jargão. */
export const EXPLICACAO_ENCAIXE =
  "Encaixe é o formato do pé da lâmpada — o código que define se ela entra no soquete do seu carro. Dois carros diferentes podem usar o mesmo encaixe.";
