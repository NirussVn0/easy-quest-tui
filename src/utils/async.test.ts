import { describe, expect, it, vi } from 'vitest';
import { runWithConcurrency, withTimeout } from './async';

describe('withTimeout', () => {
  it('returns a task result and clears its deadline timer', async () => {
    vi.useFakeTimers();

    await expect(withTimeout(Promise.resolve('done'), 1_000, 'timed out')).resolves.toBe(
      'done',
    );
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('rejects a task that does not finish before its deadline', async () => {
    vi.useFakeTimers();

    const result = withTimeout(new Promise<void>(() => {}), 1_000, 'Quest timed out');
    const assertion = expect(result).rejects.toThrow('Quest timed out');

    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    vi.useRealTimers();
  });
});

describe('runWithConcurrency', () => {
  it('runs no more than the configured number of tasks at once', async () => {
    let active = 0;
    let peakActive = 0;
    const releases: Array<() => void> = [];

    const tasks = Array.from({ length: 5 }, (_, index) => async () => {
      active++;
      peakActive = Math.max(peakActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active--;
      return index;
    });

    const result = runWithConcurrency(tasks, 2);
    await vi.waitFor(() => expect(active).toBe(2));
    expect(peakActive).toBe(2);

    while (releases.length > 0 || active > 0) {
      releases.splice(0).forEach((release) => release());
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await expect(result).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(peakActive).toBe(2);
  });

  it('continues independent tasks when one task rejects', async () => {
    const completed: number[] = [];
    const tasks = [
      async () => {
        completed.push(1);
        return 1;
      },
      async () => {
        throw new Error('account failed');
      },
      async () => {
        completed.push(3);
        return 3;
      },
    ];

    const results = await runWithConcurrency(tasks, 2);

    expect(completed).toEqual([1, 3]);
    expect(results[0]).toBe(1);
    expect(results[1]).toBeInstanceOf(Error);
    expect(results[2]).toBe(3);
  });

  it('normalizes non-Error task failures', async () => {
    const results = await runWithConcurrency(
      [async () => Promise.reject('plain failure')],
      1,
    );

    expect(results[0]).toEqual(new Error('plain failure'));
  });
});
