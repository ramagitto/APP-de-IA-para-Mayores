import type { Orm } from '../../shared/db/database.js';
import { type productEventType, productEvents } from '../../shared/db/schema.js';
import type { LessonTrigger } from '../lessons/lesson-attempt.js';

export type ProductEventType = (typeof productEventType.enumValues)[number];
export type Channel = 'web' | 'whatsapp';

export interface ProductEvent {
  /** El id de la persona en `users`. Si pide la BAJA, el evento queda anónimo. */
  subjectId: string;
  type: ProductEventType;
  occurredAt: Date;
  lessonId?: string;
  trigger?: LessonTrigger;
}

// Anota lo que pasa en el producto para las métricas del piloto. Nunca guarda textos.
export interface EventRecorder {
  record(event: ProductEvent): Promise<void>;
}

export const NO_EVENTS: EventRecorder = { record: async () => {} };

export class DbEventRecorder implements EventRecorder {
  constructor(
    private readonly orm: Orm,
    private readonly channel: Channel,
  ) {}

  async record(event: ProductEvent): Promise<void> {
    await this.orm.insert(productEvents).values({
      subjectId: event.subjectId,
      channel: this.channel,
      type: event.type,
      lessonId: event.lessonId,
      trigger: event.trigger,
      occurredAt: event.occurredAt,
    });
  }
}

export class InMemoryEventRecorder implements EventRecorder {
  readonly events: ProductEvent[] = [];

  async record(event: ProductEvent): Promise<void> {
    this.events.push(event);
  }
}
