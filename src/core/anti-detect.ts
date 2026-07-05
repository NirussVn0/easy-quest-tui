import type { RequestInit } from 'undici';
import {
  randomUserAgent,
  randomLocale,
  randomTimezone,
  randomProfile,
  sleep,
  randInt,
} from '../utils/random';
import { buildProperties } from '../config/constants';

/**
 * Anti-detection strategies to make farm traffic look like real Discord clients.
 *
 * Strategies used:
 * 1. **Profile rotation** — Each account picks a random Discord client profile
 * 2. **Header randomisation** — Vary order, user-agent, locale per request
 * 3. **Timing jitter** — Add random delays around every operation
 * 4. **Natural pacing** — Intervals vary instead of being fixed
 */

export interface AntiDetectSession {
  profile: ReturnType<typeof buildProperties>;
  userAgent: string;
  locale: string;
  timezone: string;
}

/** Create a new anti-detect session (one per account) */
export function createSession(): AntiDetectSession {
  return {
    profile: buildProperties(randomProfile()),
    userAgent: randomUserAgent(),
    locale: randomLocale(),
    timezone: randomTimezone(),
  };
}

/**
 * Decorate HTTP headers with anti-detection properties.
 * Each call slightly varies headers to avoid fingerprinting.
 */
export function decorateHeaders(
  init: RequestInit,
  session: AntiDetectSession,
): RequestInit {
  const headers = new Headers(init.headers as Record<string, string> | undefined);

  // Sanitize Authorization header: user tokens should NOT have a "Bot " prefix
  const auth = headers.get('Authorization');
  if (auth) {
    if (auth.startsWith('Bot ')) {
      headers.set('Authorization', auth.slice(4).trim());
    } else {
      headers.set('Authorization', auth.trim());
    }
  }

  headers.set('User-Agent', session.userAgent);
  headers.set('accept-language', session.locale);
  headers.set('x-discord-locale', session.locale);
  headers.set('x-discord-timezone', session.timezone);

  const method = init.method?.toUpperCase() || 'GET';

  // Origin header is only sent on state-modifying requests (like POST) in browsers
  if (method !== 'GET') {
    if (Math.random() > 0.3) {
      headers.set('origin', 'https://discord.com');
    }
  }

  if (Math.random() > 0.3) {
    headers.set('referer', 'https://discord.com/channels/@me');
  }
  if (Math.random() > 0.5) {
    headers.set('pragma', 'no-cache');
  }

  headers.set(
    'x-super-properties',
    Buffer.from(JSON.stringify(session.profile)).toString('base64'),
  );

  // Convert Headers instance back to a plain object for maximum compatibility
  const plainHeaders: Record<string, string> = {};
  headers.forEach((val, key) => {
    plainHeaders[key] = val;
  });

  const secured = { ...init, headers: plainHeaders };
  return secured;
}

/**
 * Sleep with jitter for a watch-progress tick.
 * Watch progress uses smaller, more frequent intervals.
 */
export async function watchTickSleep(): Promise<void> {
  // 800-1500ms between watch ticks
  await sleep(randInt(800, 1500));
}

/**
 * Sleep with jitter for heartbeat intervals.
 * Varies around the base interval to avoid fixed patterns.
 */
export async function heartbeatSleep(baseSeconds: number): Promise<void> {
  const jittered = baseSeconds + (Math.random() - 0.5) * 0.4 * baseSeconds;
  await sleep(Math.max(1000, jittered * 1000));
}

/**
 * Random startup stagger delay (1-8s) so not all accounts
 * connect at the exact same millisecond.
 */
export async function startupStagger(): Promise<void> {
  await sleep(randInt(1000, 8000));
}
