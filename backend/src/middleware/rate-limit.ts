import type { Request } from "express";
import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";

/**
 * O App Service escreve o X-Forwarded-For como "ip:porta". A porta muda a cada
 * requisição, então sem removê-la cada chamada vira uma chave nova: o limite
 * nunca dispara e o log enche de ValidationError.
 */
export function enderecoSemPorta(valor: string): string {
  const ipv6 = /^\[(.+)\]:\d+$/.exec(valor);
  if (ipv6) {
    return ipv6[1];
  }
  const ipv4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(valor);
  return ipv4 ? ipv4[1] : valor;
}

export function criarRateLimiter(config: {
  windowMs: number;
  max: number;
  message: { error: string };
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: config.message,
    keyGenerator: (req: Request) => ipKeyGenerator(enderecoSemPorta(req.ip ?? "")),
  });
}
