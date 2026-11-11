import type Redis from "ioredis";
import { PlateCacheRepository } from "../../repositories/plate-cache.repository";
import { PlateLookupRepository } from "../../repositories/plate-lookup.repository";
import {
  PlateInfo,
  PlateLookupLimitExceededError,
  PlateProviderUnavailableError,
  PlateService,
  PlateServiceTimeoutError,
} from "./types";

// Marca, modelo e ano de um carro não mudam — o dado mais estável que existe
// pra cachear. O prazo é longo de propósito: a API é paga por consulta.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

const MAX_LOOKUPS_PER_WINDOW = 5;
const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

function normalizar(plate: string): string {
  return plate.trim().toUpperCase();
}

function cacheKey(plate: string): string {
  return `plate:${normalizar(plate)}`;
}

/**
 * Camada na frente da API paga de placas (RF04). Guarda o resultado num cache
 * anônimo e debita a cota de quem consultou.
 *
 * RN02 — a chave do cache é a placa, mas o valor é só marca/modelo/ano e nada
 * no Redis liga a placa a uma conta. O que fica por usuário é o número de
 * consultas, nunca quais placas.
 *
 * O cache tem duas camadas: Redis na frente, pela latência, e Postgres atrás,
 * porque perder o Redis custa consulta paga. A segunda camada reaquece a
 * primeira, então a queda do Redis encarece uma vez, não sempre.
 */
export class PlateLookupService {
  constructor(
    private readonly plateService: PlateService,
    private readonly redis: Redis,
    private readonly repository: PlateLookupRepository,
    private readonly cacheRepository: PlateCacheRepository
  ) {}

  async resolveForUser(userId: string, plate: string): Promise<PlateInfo> {
    const key = cacheKey(plate);

    // O cache vem antes da cota: repetir a mesma placa não custa consulta pra
    // ninguém — nem pro usuário, nem pra conta na PuxaPlaca.
    const cached = await this.lerCache(key);
    if (cached) {
      return cached;
    }

    // Segunda camada: o Redis pode ter caído ou perdido a conexão, mas a placa
    // já foi paga uma vez. Reaquece o Redis para a próxima não vir até aqui.
    const persistido = await this.lerCachePersistido(plate);
    if (persistido) {
      await this.gravarCache(key, persistido);
      return persistido;
    }

    const gastas = await this.repository.incrementIfUnder(
      userId,
      MAX_LOOKUPS_PER_WINDOW,
      WINDOW_MS
    );
    if (gastas === null) {
      throw new PlateLookupLimitExceededError(MAX_LOOKUPS_PER_WINDOW, WINDOW_DAYS);
    }

    let info: PlateInfo;
    try {
      info = await this.plateService.resolvePlate(plate);
    } catch (error) {
      // Devolve a vaga só quando não veio resposta útil — sem saldo, fora do
      // ar, timeout. "Placa não encontrada" é resposta, e é cobrada pelo
      // fornecedor: devolver nesse caso deixaria varrer placas de graça.
      if (
        error instanceof PlateProviderUnavailableError ||
        error instanceof PlateServiceTimeoutError
      ) {
        await this.repository.refund(userId);
      }
      throw error;
    }

    await this.gravarCache(key, info);
    await this.gravarCachePersistido(plate, info);
    return info;
  }

  /**
   * Cache indisponível responde como cache vazio. Perder o cache custa
   * consulta paga; deixar ele derrubar a funcionalidade que deveria acelerar
   * custa a funcionalidade inteira.
   */
  private async lerCache(key: string): Promise<PlateInfo | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as PlateInfo) : null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Cache de placa indisponível na leitura:", error);
      return null;
    }
  }

  /**
   * Banco indisponível responde como cache vazio, mesma política do Redis: o
   * cache é otimização de custo, não dependência da funcionalidade.
   */
  private async lerCachePersistido(plate: string): Promise<PlateInfo | null> {
    try {
      return await this.cacheRepository.buscar(normalizar(plate));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Cache de placa no banco indisponível na leitura:", error);
      return null;
    }
  }

  private async gravarCachePersistido(plate: string, info: PlateInfo): Promise<void> {
    try {
      const expiraEm = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
      await this.cacheRepository.gravar(normalizar(plate), info, expiraEm);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Cache de placa no banco indisponível na gravação:", error);
    }
  }

  private async gravarCache(key: string, info: PlateInfo): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(info), "EX", CACHE_TTL_SECONDS);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Cache de placa indisponível na gravação:", error);
    }
  }
}
