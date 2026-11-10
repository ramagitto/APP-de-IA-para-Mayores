import type { Orm } from '../../shared/db/database.js';
import {
  type LessonAttempt,
  type OutgoingMessage,
  startAttempt,
} from '../lessons/lesson-attempt.js';
import {
  findOpenAttempt,
  insertAttempt,
  listCompletedLessonIds,
  updateAttempt,
} from '../lessons/lesson-attempts.repository.js';
import { handleUserMessage } from '../lessons/lesson-flow.js';
import type { Lesson } from '../lessons/lesson.schema.js';
import { nextLesson } from '../lessons/progress.js';
import type { Tutor } from '../lessons/tutor.js';
import { careResponseFor } from '../safety/safety-messages.js';
import type { LessonCalendar } from '../streaks/lesson-calendar.js';
import { canStartLesson, currentStreak, type Streak } from '../streaks/streak.js';
import { getStreak, saveStreak } from '../streaks/streaks.repository.js';
import type { VoiceService } from '../voice/voice-service.js';

export const INFO_MESSAGES = {
  unclearAudio: 'No pude entender bien el audio. ¿Me lo repetís o me lo escribís?',
  doneToday: 'Ya hiciste la lección del día. ¡Muy bien! Seguimos en la próxima.',
  allDone: '¡Terminaste todas las lecciones que tenemos por ahora! Pronto vamos a sumar más.',
};

export interface LessonMessage {
  /** La persona ya dio su consentimiento: existe en `users`. */
  userId: string;
  /** Texto escrito o la transcripción del audio. */
  text: string;
  inputWasAudio: boolean;
  now: Date;
}

export interface ReplyMessage extends OutgoingMessage {
  /** Id del audio generado. Si falta en un mensaje de audio, el canal lo manda como texto. */
  audioId?: string;
}

export interface ConversationReply {
  messages: ReplyMessage[];
  status: {
    lessonId?: string;
    state?: string;
    paidMessagesUsed?: number;
    streak: number;
  };
}

export interface ConversationDeps {
  orm: Orm;
  lessons: Lesson[];
  calendar: LessonCalendar;
  tutor: Tutor;
  voice: VoiceService;
}

interface TurnOutcome {
  messages: OutgoingMessage[];
  attempt?: LessonAttempt;
  streak: Streak;
}

// Atiende el mensaje de una persona ya registrada, venga del canal que venga. El alta, las
// palabras BAJA y AYUDA y la transcripción las resuelve antes MessageRouter.
export class ConversationService {
  constructor(private readonly deps: ConversationDeps) {}

  async handle(incoming: LessonMessage): Promise<ConversationReply> {
    const { orm, calendar } = this.deps;
    const { userId } = incoming;
    const text = incoming.text.trim();

    const streak = await getStreak(orm, userId);
    const outcome: TurnOutcome =
      text.length === 0
        ? { messages: [info(INFO_MESSAGES.unclearAudio)], streak }
        : await this.respond(userId, text, streak, incoming.now);

    return {
      messages: await this.withAudio(outcome.messages, incoming.inputWasAudio, userId),
      status: {
        ...(outcome.attempt && {
          lessonId: outcome.attempt.lessonId,
          state: outcome.attempt.state,
          paidMessagesUsed: outcome.attempt.paidMessagesUsed,
        }),
        streak: currentStreak(outcome.streak, incoming.now, calendar),
      },
    };
  }

  private async respond(
    userId: string,
    text: string,
    streak: Streak,
    now: Date,
  ): Promise<TurnOutcome> {
    const { orm, lessons, calendar, tutor } = this.deps;
    const stored = await findOpenAttempt(orm, userId);
    const lesson = stored && lessons.find((candidate) => candidate.id === stored.attempt.lessonId);

    // Hay una lección en curso: sigue el motor, que también se ocupa de los mensajes de cuidado.
    if (stored && lesson) {
      const turn = await handleUserMessage({
        attempt: stored.attempt,
        lesson,
        text,
        streak,
        tutor,
        calendar,
        now,
        userId,
      });

      if (turn.attempt !== stored.attempt) await updateAttempt(orm, stored.id, turn.attempt);
      if (turn.streak !== streak) await saveStreak(orm, userId, turn.streak, now);

      return turn;
    }

    // Sin lección en curso, el cuidado también va primero.
    const careMessage = careResponseFor(text);
    if (careMessage)
      return { messages: [{ kind: 'care', format: 'text', text: careMessage }], streak };

    if (!canStartLesson(streak, now, calendar)) {
      return { messages: [info(INFO_MESSAGES.doneToday)], streak };
    }

    const next = nextLesson(lessons, await listCompletedLessonIds(orm, userId));
    if (!next) return { messages: [info(INFO_MESSAGES.allDone)], streak };

    // Cualquier mensaje en un día de lección la dispara: la ventana de 24 horas la abre la persona.
    const started = startAttempt({ lesson: next, trigger: 'user_message', now });
    await insertAttempt(orm, userId, started.attempt);

    return { ...started, streak };
  }

  // Voz primero: la intro va siempre en audio. Si la persona habló, Charlá también le habla.
  // Los mensajes de cuidado van en texto, para que los números se puedan leer y copiar.
  private async withAudio(
    messages: OutgoingMessage[],
    inputWasAudio: boolean,
    userId: string,
  ): Promise<ReplyMessage[]> {
    const replies: ReplyMessage[] = [];

    for (const message of messages) {
      const wantsAudio = message.format === 'audio' || (inputWasAudio && message.kind !== 'care');
      if (!wantsAudio) {
        replies.push(message);
        continue;
      }

      const audioId = await this.deps.voice.speak(message.text, userId);
      replies.push({ ...message, format: 'audio', ...(audioId && { audioId }) });
    }

    return replies;
  }
}

function info(text: string): OutgoingMessage {
  return { kind: 'info', format: 'text', text };
}
