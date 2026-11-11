import Redis from "ioredis";

/**
 * Instância única compartilhada, no mesmo espírito do db/prisma.ts. A fila de
 * notificações tem a própria conexão porque o Bull gerencia a dele.
 *
 * A fila offline do ioredis (ligada por padrão) segura o comando até o Redis
 * voltar — o que pendurava a requisição inteira junto. Aqui o cache é
 * otimização, não dependência: melhor o comando falhar rápido e a consulta
 * seguir pro fornecedor.
 */
export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  // O App Service derruba conexão de saída parada por volta de 4 minutos. Sem
  // keepalive o socket morre em silêncio e a leitura do cache falha, o que
  // manda para a API paga uma placa que já estava guardada.
  keepAlive: 30_000,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  commandTimeout: 1000,
});

// Sem listener, um erro de conexão derruba o processo inteiro.
redis.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error("Erro na conexão com o Redis:", error);
});

// Sem a fila offline, um comando disparado antes do handshake falha. Quem
// precisa do cache quente (os testes) espera a conexão ficar pronta.
export function redisReady(): Promise<void> {
  if (redis.status === "ready") {
    return Promise.resolve();
  }
  return new Promise((resolve) => redis.once("ready", () => resolve()));
}

export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch {
    // quit() rejeita se a conexão já caiu; o socket ainda precisa ser fechado.
    redis.disconnect();
  }
}
