import { PgBoss } from 'pg-boss';

export type JobHandler = (eventId: string) => Promise<void>;

// Cola de mensajes por procesar. El webhook contesta enseguida y el trabajo pesado (voz, IA,
// envíos) se hace después, con reintentos.
export interface JobQueue {
  send(eventId: string): Promise<void>;
}

/** Para tests: procesa en el momento. */
export class InlineQueue implements JobQueue {
  constructor(private readonly handler: JobHandler) {}

  async send(eventId: string): Promise<void> {
    await this.handler(eventId);
  }
}

export const INBOUND_QUEUE = 'whatsapp-inbound';

// Cola real, guardada en el mismo Postgres (ADR 0002).
export class PgBossQueue implements JobQueue {
  private readonly boss: PgBoss;

  constructor(
    connectionString: string,
    // Los tests usan otro nombre, para que ningún otro proceso les tome los trabajos.
    private readonly queueName = INBOUND_QUEUE,
  ) {
    this.boss = new PgBoss(connectionString);
  }

  async start(handler: JobHandler): Promise<void> {
    await this.boss.start();
    await this.boss.createQueue(this.queueName, {
      // Si falla (por ejemplo, WhatsApp no responde), reintenta con esperas crecientes.
      retryLimit: 5,
      retryDelay: 10,
      retryBackoff: true,
      // Los datos del trabajo son solo un id, pero igual se borran pronto.
      deleteAfterSeconds: 24 * 60 * 60,
    });
    await this.boss.work<{ eventId: string }>(this.queueName, async (jobs) => {
      for (const job of jobs) await handler(job.data.eventId);
    });
  }

  async send(eventId: string): Promise<void> {
    // singletonKey evita encolar dos veces el mismo mensaje.
    await this.boss.send(this.queueName, { eventId }, { singletonKey: eventId });
  }

  async stop(): Promise<void> {
    await this.boss.stop({ graceful: true });
  }
}
