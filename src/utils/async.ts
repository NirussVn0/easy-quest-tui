export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/** Run independent tasks with a fixed worker count, preserving input order. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<T | Error>> {
  const results = new Array<T | Error>(tasks.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        results[index] = await tasks[index]!();
      } catch (error) {
        results[index] = error instanceof Error ? error : new Error(String(error));
      }
    }
  };

  const workerCount = Math.min(Math.max(Math.trunc(concurrency), 1), tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
