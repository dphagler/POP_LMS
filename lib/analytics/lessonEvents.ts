import { z } from "zod";

type Listener<Payload> = (payload: Payload) => void | Promise<void>;

type EventQueueItem<EventName extends string, Payload> = {
  event: EventName;
  payload: Payload;
  attempts: number;
};

const basePayloadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  orgId: z.string().min(1, "orgId is required"),
  lessonId: z.string().min(1, "lessonId is required"),
  deviceType: z.string().min(1, "deviceType is required"),
});

const assessmentResultPayloadSchema = basePayloadSchema.extend({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  threshold: z.number().min(0).max(1),
});

const eventSchemas = {
  lesson_view_start: basePayloadSchema,
  lesson_view_complete: basePayloadSchema,
  assessment_start: basePayloadSchema,
  assessment_submit: basePayloadSchema,
  assessment_result: assessmentResultPayloadSchema,
  augmentation_start: basePayloadSchema,
  augmentation_complete: basePayloadSchema,
} as const;

type LessonAnalyticsEvent = keyof typeof eventSchemas;

type LessonAnalyticsEventPayloads = {
  [Event in LessonAnalyticsEvent]: z.infer<(typeof eventSchemas)[Event]>;
};

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 1000;

export class LessonEventsEmitter {
  private listeners: {
    [Event in LessonAnalyticsEvent]: Set<Listener<LessonAnalyticsEventPayloads[Event]>>;
  } = {
    lesson_view_start: new Set(),
    lesson_view_complete: new Set(),
    assessment_start: new Set(),
    assessment_submit: new Set(),
    assessment_result: new Set(),
    augmentation_start: new Set(),
    augmentation_complete: new Set(),
  };

  private readonly queue: Array<EventQueueItem<LessonAnalyticsEvent, LessonAnalyticsEventPayloads[LessonAnalyticsEvent]>> = [];
  private isFlushingQueue = false;

  constructor(
    private readonly options: {
      maxRetries?: number;
      retryDelayMs?: number;
    } = {},
  ) {}

  on<Event extends LessonAnalyticsEvent>(
    event: Event,
    listener: Listener<LessonAnalyticsEventPayloads[Event]>,
  ) {
    this.listeners[event].add(listener);

    return () => this.off(event, listener);
  }

  off<Event extends LessonAnalyticsEvent>(
    event: Event,
    listener: Listener<LessonAnalyticsEventPayloads[Event]>,
  ) {
    this.listeners[event].delete(listener);
  }

  emit<Event extends LessonAnalyticsEvent>(
    event: Event,
    payload: LessonAnalyticsEventPayloads[Event],
  ) {
    const schema = eventSchemas[event];
    const parsedPayload = schema.safeParse(payload);

    if (!parsedPayload.success) {
      console.error(
        `Invalid payload provided for lesson analytics event "${event}".`,
        parsedPayload.error,
      );
      return;
    }

    const validatedPayload = parsedPayload.data as LessonAnalyticsEventPayloads[Event];

    queueMicrotask(() => {
      void this.processEvent(event, validatedPayload);
    });
  }

  private async processEvent<Event extends LessonAnalyticsEvent>(
    event: Event,
    payload: LessonAnalyticsEventPayloads[Event],
    attempts = 0,
  ) {
    const success = await this.dispatch(event, payload);

    if (!success) {
      this.enqueue(event, payload, attempts + 1);
    }
  }

  private async dispatch<Event extends LessonAnalyticsEvent>(
    event: Event,
    payload: LessonAnalyticsEventPayloads[Event],
  ) {
    const listeners = Array.from(this.listeners[event]);

    if (listeners.length === 0) {
      return true;
    }

    const results = await Promise.all(
      listeners.map(async (listener) => {
        try {
          await listener(payload);
          return true;
        } catch (error) {
          console.error(`Lesson analytics listener for "${event}" failed.`, error);
          return false;
        }
      }),
    );

    return results.every(Boolean);
  }

  private enqueue<Event extends LessonAnalyticsEvent>(
    event: Event,
    payload: LessonAnalyticsEventPayloads[Event],
    attempts: number,
  ) {
    const maxRetries = this.options.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (attempts > maxRetries) {
      console.warn(
        `Lesson analytics event "${event}" dropped after exceeding ${maxRetries} attempts.`,
      );
      return;
    }

    this.queue.push({
      event,
      payload,
      attempts,
    });

    this.scheduleQueueFlush();
  }

  private scheduleQueueFlush() {
    if (this.isFlushingQueue) {
      return;
    }

    const retryDelayMs = this.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    this.isFlushingQueue = true;

    setTimeout(() => {
      void this.flushQueue();
    }, retryDelayMs);
  }

  private async flushQueue() {
    const retryDelayMs = this.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      if (!item) {
        continue;
      }

      const success = await this.dispatch(item.event, item.payload);

      if (!success) {
        if (item.attempts >= (this.options.maxRetries ?? DEFAULT_MAX_RETRIES)) {
          console.warn(
            `Lesson analytics event "${item.event}" dropped after exceeding ${
              this.options.maxRetries ?? DEFAULT_MAX_RETRIES
            } attempts.`,
          );
        } else {
          this.queue.push({
            ...item,
            attempts: item.attempts + 1,
          });
        }
      }

      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    this.isFlushingQueue = false;
  }
}

export const lessonEvents = new LessonEventsEmitter();
