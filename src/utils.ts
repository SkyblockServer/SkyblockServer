import { randomUUID } from 'crypto';

let asyncIntervals = {};
export function setAsyncInterval(func: () => Promise<void> | void, ms: number, runAtStart = false): string {
  const id = randomUUID();
  asyncIntervals[id] = true;

  (async () => {
    if (runAtStart) await func();
    while (asyncIntervals[id]) {
      await new Promise(res => setTimeout(res, ms));
      if (asyncIntervals[id]) await func();
    }
  })();

  return id;
}
export function clearAsyncInterval(id: string): void {
  delete asyncIntervals[id];
}
