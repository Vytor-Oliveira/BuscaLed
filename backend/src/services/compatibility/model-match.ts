export interface ModelCandidate {
  id: string;
  model: string;
}

interface Score {
  tokens: number;
  index: number;
  chars: number;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

// Nome base do carro na matriz: o primeiro token e, quando o segundo também é
// palavra, os dois juntos — cobre nome composto ("SANTA FE") sem capturar
// cilindrada ("1.6") nem versão ("16V").
function baseNames(model: string): string[][] {
  const tokens = tokenize(model);
  if (tokens.length === 0) {
    return [];
  }

  const names = [[tokens[0]]];
  if (tokens[1] && /^[A-Z]+$/.test(tokens[1])) {
    names.push([tokens[0], tokens[1]]);
  }
  return names;
}

function sequenceIndex(
  queryTokens: string[],
  needle: string[],
  knownNames: Set<string>
): number {
  for (let i = 0; i <= queryTokens.length - needle.length; i += 1) {
    const matches = needle.every((part, offset) => {
      const token = queryTokens[i + offset];
      if (token === part) {
        return true;
      }
      // A API às vezes cola o nome no acabamento sem espaço ("C63AMGP30").
      // Casar por início só vale quando o token não é, ele mesmo, nome de carro
      // conhecido — senão GOL casaria em GOLF.
      return needle.length === 1 && !knownNames.has(token) && token.startsWith(part);
    });

    if (matches) {
      return i;
    }
  }
  return -1;
}

function isBetter(candidate: Score, current: Score): boolean {
  if (candidate.tokens !== current.tokens) {
    return candidate.tokens > current.tokens;
  }
  if (candidate.index !== current.index) {
    return candidate.index < current.index;
  }
  return candidate.chars > current.chars;
}

function scoreCandidate(
  queryTokens: string[],
  model: string,
  knownNames: Set<string>
): Score | null {
  let best: Score | null = null;

  for (const name of baseNames(model)) {
    const index = sequenceIndex(queryTokens, name, knownNames);
    if (index === -1) {
      continue;
    }

    const score: Score = { tokens: name.length, index, chars: name.join(" ").length };
    if (!best || isBetter(score, best)) {
      best = score;
    }
  }

  return best;
}

/**
 * Casa o modelo que a API de placa devolveu ("NOVA SAVEIRO RB MBVS") com os
 * modelos da matriz ("Saveiro Robust 1.6 MSI CD (Flex)"), que nunca batem por
 * igualdade. Devolve todos os candidatos empatados na melhor pontuação — se
 * isso é ambíguo de verdade, quem decide é o serviço, comparando a iluminação.
 *
 * `knownModels` são todos os modelos da mesma marca, de qualquer ano: é o que
 * protege o match por início de token. Sem o ano na conta, um GOLF de ano não
 * cadastrado continua bloqueando o GOL em vez de casar errado.
 */
export function matchModelCandidates<T extends ModelCandidate>(
  queryModel: string,
  candidates: T[],
  knownModels: string[] = candidates.map((candidate) => candidate.model)
): T[] {
  const query = normalize(queryModel);
  const exact = candidates.filter((candidate) => normalize(candidate.model) === query);
  if (exact.length > 0) {
    return exact;
  }

  const knownNames = new Set(knownModels.flatMap((model) => tokenize(model).slice(0, 1)));
  const queryTokens = tokenize(queryModel);

  const scored: Array<{ candidate: T; score: Score }> = [];
  for (const candidate of candidates) {
    const score = scoreCandidate(queryTokens, candidate.model, knownNames);
    if (score) {
      scored.push({ candidate, score });
    }
  }

  if (scored.length === 0) {
    return [];
  }

  // Semente explicita: reduce sem valor inicial estoura em lista vazia, e a
  // guarda acima e a unica coisa que impedia isso hoje.
  const best = scored.reduce(
    (winner, entry) => (isBetter(entry.score, winner.score) ? entry : winner),
    scored[0]
  );

  return scored
    .filter(
      (entry) =>
        entry.score.tokens === best.score.tokens &&
        entry.score.index === best.score.index &&
        entry.score.chars === best.score.chars
    )
    .map((entry) => entry.candidate);
}
