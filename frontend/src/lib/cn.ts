type Classe = string | number | boolean | null | undefined;

/**
 * Junta classes ignorando tudo que não seja string com conteúdo. Aceita number
 * e boolean porque `valor && "classe"` em JSX pode produzir 0 ou false quando
 * o valor testado é um ReactNode.
 *
 * Nao faz merge de conflito como o tailwind-merge: os componentes daqui colocam
 * a classe recebida por ultimo, entao quem chama consegue sobrescrever pela
 * ordem da cascata.
 */
export function cn(...classes: Classe[]): string {
  return classes.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}
