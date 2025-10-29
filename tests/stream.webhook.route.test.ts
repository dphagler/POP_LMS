import { createHmac } from 'node:crypto';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_STREAM_ENABLED = process.env.STREAM_ENABLED;
const ORIGINAL_STREAM_WEBHOOK_SECRET = process.env.STREAM_WEBHOOK_SECRET;

const TEST_URL = 'https://example.com/api/stream/webhook';

function setEnv(enabled: boolean, secret?: string) {
  if (enabled) {
    process.env.STREAM_ENABLED = 'true';
  } else {
    delete process.env.STREAM_ENABLED;
  }

  if (secret) {
    process.env.STREAM_WEBHOOK_SECRET = secret;
  } else {
    delete process.env.STREAM_WEBHOOK_SECRET;
  }
}

describe('POST /api/stream/webhook', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.STREAM_ENABLED;
    delete process.env.STREAM_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_STREAM_ENABLED === undefined) {
      delete process.env.STREAM_ENABLED;
    } else {
      process.env.STREAM_ENABLED = ORIGINAL_STREAM_ENABLED;
    }

    if (ORIGINAL_STREAM_WEBHOOK_SECRET === undefined) {
      delete process.env.STREAM_WEBHOOK_SECRET;
    } else {
      process.env.STREAM_WEBHOOK_SECRET = ORIGINAL_STREAM_WEBHOOK_SECRET;
    }
  });

  it('returns disabled response when configuration is missing', async () => {
    setEnv(false);

    const { POST } = await import('@/app/api/stream/webhook/route');

    const request = new Request(TEST_URL, { method: 'POST' });
    const response = await POST(request as unknown as Request);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ ok: true, disabled: true });
  });

  it('rejects missing signatures when enabled', async () => {
    const secret = 'stream-secret';
    setEnv(true, secret);

    const { POST } = await import('@/app/api/stream/webhook/route');

    const body = JSON.stringify({
      type: 'play',
      streamId: 'stream-1',
      lessonId: 'lesson-1',
      userId: 'user-1',
      at: 42,
    });

    const request = new Request(TEST_URL, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as unknown as Request);

    expect(response.status).toBe(401);
  });

  it('rejects invalid signatures', async () => {
    const secret = 'stream-secret';
    setEnv(true, secret);

    const { POST } = await import('@/app/api/stream/webhook/route');

    const body = JSON.stringify({
      type: 'paused',
      streamId: 'stream-2',
      lessonId: 'lesson-2',
      userId: 'user-2',
      at: 12,
    });

    const request = new Request(TEST_URL, {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': 'deadbeef',
      },
    });

    const response = await POST(request as unknown as Request);

    expect(response.status).toBe(401);
  });

  it('accepts valid signatures and forwards timestamps to the heartbeat aggregator', async () => {
    const secret = 'stream-secret';
    setEnv(true, secret);

    const progressModule = await import('@/lib/lesson/progress');
    const mergeSpy = vi.spyOn(progressModule, 'mergeSegments');

    const { POST } = await import('@/app/api/stream/webhook/route');

    const body = JSON.stringify({
      events: [
        {
          type: 'ended',
          streamId: 'stream-3',
          lessonId: 'lesson-3',
          userId: 'user-3',
          at: 99.7,
        },
      ],
    });

    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const request = new Request(TEST_URL, {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': signature,
      },
    });

    const response = await POST(request as unknown as Request);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ ok: true, received: 1 });

    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith([[99, 100]]);

    mergeSpy.mockRestore();
  });
});
