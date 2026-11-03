// A API de placa devolve a marca como o código do registro nacional (RENAVAM),
// que às vezes é abreviado ("VW", "CHEV", "MMC") e às vezes é o nome completo
// ("HONDA", "FIAT"). Só entram aqui os códigos confirmados na tabela oficial de
// código marca/modelo; marca sem código confirmado passa direto e, se não bater
// com a matriz, cai no cadastro manual — chutar aqui mostraria LED de outro carro.
const CANONICAL_MAKE_BY_CODE: Record<string, string> = {
  VW: "VOLKSWAGEN",
  CHEV: "CHEVROLET",
  GM: "CHEVROLET",
  MMC: "MITSUBISHI",
  MBENZ: "MERCEDES-BENZ",
  CITROEN: "CITROËN",
  HYUNDAY: "HYUNDAI",
};

function codeKey(make: string): string {
  return make
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function resolveCanonicalMake(make: string): string {
  return CANONICAL_MAKE_BY_CODE[codeKey(make)] ?? make.trim().toUpperCase();
}
