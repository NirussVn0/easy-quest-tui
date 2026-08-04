import { afterEach, describe, expect, it } from 'vitest';
import { readConfig } from './env';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('readConfig timeouts', () => {
  it('configures gateway timeout independently from REST request timeout', () => {
    process.env.TOKEN = 'test-token';
    process.env.TOKENS_FILE = 'missing-test-tokens.txt';
    process.env.REQUEST_TIMEOUT_SECONDS = '5';
    process.env.GATEWAY_TIMEOUT_SECONDS = '90';

    const config = readConfig();

    expect(config.requestTimeoutMs).toBe(5_000);
    expect(config.gatewayTimeoutMs).toBe(90_000);
  });
});
