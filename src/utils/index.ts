import { randomUUID } from 'crypto';
import { NBTFormat, parse as parseNBT } from 'prismarine-nbt';

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

export const wait = (ms?: number): Promise<void> => new Promise(res => setTimeout(res, ms));

export async function parseNBTData(
  data: Buffer | string,
  nbtType?: 'big' | 'little' | 'littleVarint'
): Promise<{
  parsed: {
    type: 'compound';
    value: any;
  } & {
    name: string;
  };
  type: NBTFormat;
  metadata: {
    // The decompressed buffer
    buffer: Buffer;
    // The length of bytes read from the buffer
    size: number;
  };
}> {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data, 'base64');

  return parseNBT(data, nbtType);
}

export function t(num: number, type: 'ms' | 's' | 'm' | 'h' | 'd' | 'w'): number {
  const mappings = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return num * mappings[type];
}

export function nextBidPrice(currentPrice: number): number {
  if (currentPrice < 1) return 2;
  if (currentPrice >= 1 && currentPrice <= 3) return Math.floor(currentPrice) + 1;

  return Math.round(currentPrice * 1.15);
}
export function lastBidPrice(currentPrice: number): number {
  if (currentPrice < 2) return Math.floor(currentPrice);
  if (currentPrice >= 2 && currentPrice <= 4) return Math.floor(currentPrice - 1);
  return currentPrice * (1 / 1.15);
}
