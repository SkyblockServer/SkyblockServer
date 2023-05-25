import { randomUUID } from 'crypto';
import { parse as parseNBT } from 'prismarine-nbt';

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
  type: 'big' | 'little' | 'littleVarint';
  metadata: {
    // The decompressed buffer
    buffer: Buffer;
    // The length of bytes read from the buffer
    size: number;
  };
}> {
  if (!Buffer.isBuffer(data)) {
    data = Buffer.from(data, 'base64');
  }
  return parseNBT(data, nbtType);
}
