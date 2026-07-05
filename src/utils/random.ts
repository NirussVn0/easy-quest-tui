import { USER_AGENTS, LOCALES, TIMEZONES, CLIENT_PROFILES } from '../config/constants';
import type { ClientProfile } from '../config/constants';

/**
 * Randomised utilities to make bot behaviour look human/natural
 * and reduce the chance of Discord's anti-bot detection flagging us.
 */

/** Return a random integer in [min, max] */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a random float in [min, max] */
export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Pick a random element from an array */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Add ±percentage jitter to value.
 * E.g. jitter(100, 0.2) → 80–120
 */
export function jitter(value: number, percentage: number): number {
  const delta = value * percentage;
  return value + randFloat(-delta, delta);
}

/**
 * Return a random delay in milliseconds within [min, max].
 * Use this between operations to look human.
 */
export function delayMs(min: number, max: number): number {
  return randInt(min, max);
}

/** Async sleep with optional jitter */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sleep for a random duration in [min, max] */
export async function randomSleep(min: number, max: number): Promise<void> {
  return sleep(delayMs(min, max));
}

/** Pick a random user agent string */
export function randomUserAgent(): string {
  return pick(USER_AGENTS);
}

/** Pick a random locale */
export function randomLocale(): string {
  return pick(LOCALES);
}

/** Pick a random timezone */
export function randomTimezone(): string {
  return pick(TIMEZONES);
}

/** Pick a random client profile */
export function randomProfile(): ClientProfile {
  return pick(CLIENT_PROFILES);
}
