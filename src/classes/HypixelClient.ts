import axios from 'axios';
import { setAsyncInterval } from '../utils';
import Logger from './Logger';

const logger = new Logger('Hypixel');

/** A Custom Hypixel Client with Caching and Queueing */
export default class HypixelClient {
  /** The Hypixel API Key */
  public apiKey: string;
  /** All Known Valid API Keys */
  public validKeys: string[];

  /** The Request Queue */
  public queue: (() => Promise<void>)[] = [];

  /** Requests Left for the Current Minute */
  public requestsLeft = 1;

  /** The Timeout set for a Request Limit Reset */
  public resetTimeout: NodeJS.Timeout;

  /** The Request Headers Used */
  public get headers() {
    return {
      'API-Key': this.apiKey,
    };
  }

  /** Data for the Client */
  public data: HypixelData = {};

  /** A Custom Hypixel Client with Caching */
  constructor(apiKey: string) {
    this.apiKey = apiKey;

    this.setupQueue();
  }

  private async setupQueue() {
    setAsyncInterval(async () => {
      if (this.queue.length && this.requestsLeft > 0) {
        await this.queue[0]();
        this.queue.splice(0, 1);
      }
    });
  }

  public fetch(url: string, options: FetchOptions = {}): Promise<any> {
    let resolve: (data: any) => void;

    let attempts = 0;
    const func = async () => {
      attempts += 1;

      const res = await axios
        .get(url, {
          headers: options.noHeaders ? {} : this.headers,
        })
        .catch(err => err.response);

      if (!res) {
        if (attempts >= 3) return resolve(null);
        return this.queue.splice(0, 0, func);
      }

      if (res.headers['ratelimit-limit']) {
        if (!this.resetTimeout) {
          this.resetTimeout = setTimeout(() => {
            this.requestsLeft = res.headers['ratelimit-limit'];
            this.resetTimeout = null;
          }, parseInt(res.headers['ratelimit-reset']) * 1000);
        }
        this.requestsLeft = parseInt(res.headers['ratelimit-remaining']);
      }

      if (res.status === 429) {
        logger.warn('Ratelimited!');
        this.requestsLeft = 0;
        if (!this.resetTimeout) {
          this.resetTimeout = setTimeout(() => {
            this.fetchKeyInfo();
            this.requestsLeft = 1;
          }, 60_000);
        }
        return this.queue.push(func);
      }

      resolve(res.data);
    };

    if (options.ignoreRateLimit) func();
    else if (options.priority) this.queue.splice(0, 0, func);
    else this.queue.push(func);

    return new Promise(res => {
      resolve = res;
    });
  }

  /**
   * Fetch the Info for an API Key
   * @param key The API Key (leave empty to use the Client's key)
   */
  public async fetchKeyInfo(key: string = this.apiKey) {
    return await this.fetch(`https://api.hypixel.net/key?key=${key}`, {
      noHeaders: true,
      priority: true,
      ignoreRateLimit: key !== this.apiKey,
    });
  }
}

interface FetchOptions {
  /** Whether the Request should go to the front of the queue */
  priority?: boolean;

  /**
   * Whether to ignore the ratelimit-handling queue and skip straight to the request, only recommended on routes which by-default ignore the ratelimit
   *
   * **WARNING:** DANGEROUS
   */
  ignoreRateLimit?: boolean;

  /** Whether to not put the default headers in */
  noHeaders?: boolean;
}

interface HypixelData {}
