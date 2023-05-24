import { randomUUID } from 'crypto';

export const genRandomUUID = () => randomUUID();

let asyncIntervals = {};
export function setAsyncInterval(func: () => Promise<void> | void, ms: number = 1, runAtStart = false): string {
  const id = genRandomUUID();
  asyncIntervals[id] = true;

  (async () => {
    if (runAtStart) await func();
    while (asyncIntervals[id]) {
      await wait(ms);
      if (asyncIntervals[id]) await func();
    }
  })();

  return id;
}
export function clearAsyncInterval(id: string): void {
  delete asyncIntervals[id];
}

export const wait = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));
