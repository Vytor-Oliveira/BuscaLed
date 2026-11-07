const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dataLonga = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const inteiro = new Intl.NumberFormat("pt-BR");

const porcento = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

export function formatarDataLonga(iso: string): string {
  return dataLonga.format(new Date(iso));
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Dinheiro chega em centavos inteiros do backend — ponto flutuante em preço é
 * a origem clássica do erro de um centavo. A divisão por 100 acontece só aqui,
 * na borda de exibição.
 */
export function formatarPreco(centavos: number | null | undefined): string | null {
  if (centavos === null || centavos === undefined) {
    return null;
  }
  return moeda.format(centavos / 100);
}

/** Soma de itens já em centavos, formatada de uma vez. */
export function formatarTotal(centavos: number): string {
  return moeda.format(centavos / 100);
}

/**
 * "129,90" e "129.90" viram 12990. O decimal é o último separador quando sobram
 * 1 ou 2 dígitos depois dele; com 3 dígitos ou nenhum, ele é milhar — "1.299"
 * é mil duzentos e noventa e nove reais. Apagar todo ponto, como era antes,
 * lia "129.90" como 12990 reais: cem vezes o preço, sem erro na tela.
 *
 * Os centavos saem de concatenação de texto, não de `valor * 100`, para o
 * ponto flutuante não entrar no caminho do dinheiro.
 */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo.replace(/[,.]/g, "")) {
    return null;
  }

  const ultimo = Math.max(limpo.lastIndexOf(","), limpo.lastIndexOf("."));
  const casas = ultimo === -1 ? 0 : limpo.length - ultimo - 1;
  const ehDecimal = casas === 1 || casas === 2;

  const reais = (ehDecimal ? limpo.slice(0, ultimo) : limpo).replace(/[,.]/g, "");
  const centavos = ehDecimal ? limpo.slice(ultimo + 1).padEnd(2, "0") : "00";

  const valor = Number(`${reais || "0"}${centavos}`);
  return Number.isSafeInteger(valor) ? valor : null;
}

/** 12990 vira "129,90" para preencher o campo de edição. */
export function textoDeCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) {
    return "";
  }
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function formatarInteiro(n: number): string {
  return inteiro.format(n);
}

/** Recebe a fracao, nao o valor ja multiplicado por cem. */
export function formatarPorcento(fracao: number): string {
  return porcento.format(fracao);
}

/** "há 3 dias", para a fila e para Meus Pedidos. */
export function tempoRelativo(iso: string): string {
  const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 60) {
    return relativo.format(-minutos, "minute");
  }
  if (minutos < 60 * 24) {
    return relativo.format(-Math.round(minutos / 60), "hour");
  }
  return relativo.format(-Math.round(minutos / (60 * 24)), "day");
}

/* --------------------------------------------------------------------------
   Mascaras. Todas sao puras e recebem o valor cru do input.
   -------------------------------------------------------------------------- */

/**
 * Mercosul (ABC1D23) e antiga (ABC1234) tem o mesmo tamanho e diferem so na
 * quinta posicao, entao a mascara nao escolhe formato: normaliza para sete
 * caracteres maiusculos e deixa a validacao decidir.
 */
export function mascaraPlaca(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

const RE_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;
const RE_ANTIGA = /^[A-Z]{3}\d{4}$/;

export function placaValida(valor: string): boolean {
  const limpa = mascaraPlaca(valor);
  return RE_MERCOSUL.test(limpa) || RE_ANTIGA.test(limpa);
}

/** (48) 99999-9999 — e tambem fixo de oito digitos. */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) {
    return d.length ? `(${d}` : "";
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  }
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function telefoneValido(valor: string): boolean {
  return valor.replace(/\D/g, "").length >= 10;
}

/** Anos que o seletor manual oferece, do mais recente para o mais antigo. */
export function anosDisponiveis(de = 1990): number[] {
  const ate = new Date().getFullYear() + 1;
  const anos: number[] = [];
  for (let ano = ate; ano >= de; ano -= 1) {
    anos.push(ano);
  }
  return anos;
}

/** Primeira letra de cada palavra, para avatar sem foto. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return "?";
  }
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
