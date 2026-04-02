/** Limite les exécutions concurrentes avec file d'attente FIFO (évite la saturation sous charge). */
export function createConcurrentLimiter(maxConcurrent: number) {
  const max = Math.max(1, maxConcurrent);
  let active = 0;
  const queue: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (active < max) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      queue.push(() => {
        active += 1;
        resolve();
      });
    });
  }

  function release() {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}
