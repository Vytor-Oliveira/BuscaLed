import Queue from "bull";
import Redis, { RedisOptions } from "ioredis";
import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "../services/notification/types";

export type NotificationJob =
  | { type: "confirmationEmail"; email: string; token: string }
  | { type: "passwordResetEmail"; email: string; token: string }
  | { type: "lowStockAlert"; to: string; info: StockAlertInfo }
  | { type: "newTicket"; to: string; info: NewTicketInfo }
  | { type: "ticketEdited"; to: string; info: TicketEditedInfo }
  | { type: "ticketCancelled"; to: string; info: TicketCancelledInfo };

export const NOTIFICATION_QUEUE_NAME = "notifications";

export function createNotificationQueue(
  queueName: string = NOTIFICATION_QUEUE_NAME
): Queue.Queue<NotificationJob> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  // O App Service descarta conexão de saída que fica cerca de 4 minutos sem
  // trafegar nada. A conexão de pub/sub do Bull é ociosa por natureza, então
  // era derrubada em ciclo e o log enchia de ECONNRESET. O keepalive mantém o
  // socket vivo sem depender de haver mensagem.
  const comKeepAlive: RedisOptions = { keepAlive: 30_000 };

  const queue = new Queue<NotificationJob>(queueName, redisUrl, {
    // O Bull exige estas duas opções nas conexões de bloqueio e de pub/sub.
    createClient: (tipo) =>
      tipo === "client"
        ? new Redis(redisUrl, comKeepAlive)
        : new Redis(redisUrl, {
            ...comKeepAlive,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }),
    defaultJobOptions: {
      // O padrão do Bull é 1 tentativa: uma oscilação do SMTP perderia o
      // e-mail de vez, que é justamente o que a fila deveria evitar.
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      // O job de confirmação carrega o token da conta — sem remover, ele ficaria
      // legível no Redis indefinidamente depois do envio.
      removeOnComplete: true,
      removeOnFail: 100,
    },
    // O Redis gerenciado do plano gratuito cobra por comando (500 mil/mês), e o
    // Bull consulta o Redis mesmo com a fila vazia. Com os padrões — guarda a
    // cada 5s, bloqueio de leitura de 5s, varredura de travados a cada 30s — são
    // cerca de 37 mil comandos por dia, 1,1 milhão por mês: o dobro da cota, sem
    // um único usuário no ar.
    //
    // Medido contra um Redis real, com a fila ociosa: o padrão dá 59 comandos
    // por minuto (~2,5 milhões/mês) e os valores abaixo dão por volta de 4-5
    // (~190 mil/mês), contra uma cota gratuita de 500 mil.
    //
    // drainDelay é 120 e não 300 de propósito: com 300 a leitura bloqueante
    // ficava 5 minutos em silêncio e o App Service cortava a conexão antes de
    // ela responder. Precisa ficar abaixo dos ~4 minutos de ociosidade que a
    // infraestrutura tolera.
    //
    // O preço é que um job atrasado — retentativa com backoff — pode demorar até
    // 60s a mais para ser pego, e um job travado até 5 min para ser detectado.
    // Job novo não é afetado: o BRPOPLPUSH retorna assim que algo entra na fila,
    // não no fim do intervalo.
    settings: {
      guardInterval: 60_000,
      stalledInterval: 300_000,
      drainDelay: 120,
    },
  });

  // Sem listener, um erro de conexão com o Redis derruba o processo inteiro.
  queue.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Erro na fila de notificações (Redis indisponível?):", error);
  });

  queue.on("failed", (job, error) => {
    // eslint-disable-next-line no-console
    console.error(
      `Notificação ${job.data.type} falhou (tentativa ${job.attemptsMade}/${job.opts.attempts}):`,
      error
    );
  });

  return queue;
}

export function registerNotificationProcessor(
  queue: Queue.Queue<NotificationJob>,
  realSender: EmailSender
): void {
  queue.process(async (job) => {
    const data = job.data;
    switch (data.type) {
      case "confirmationEmail":
        return realSender.sendConfirmationEmail(data.email, data.token);
      case "passwordResetEmail":
        return realSender.sendPasswordResetEmail(data.email, data.token);
      case "lowStockAlert":
        return realSender.sendLowStockAlert(data.to, data.info);
      case "newTicket":
        return realSender.sendNewTicketNotification(data.to, data.info);
      case "ticketEdited":
        return realSender.sendTicketEditedNotification(data.to, data.info);
      case "ticketCancelled":
        return realSender.sendTicketCancelledNotification(data.to, data.info);
    }
  });
}
