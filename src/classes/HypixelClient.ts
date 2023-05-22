import axios from 'axios';

/** A Custom Hypixel Client with Caching and Queueing */
export default class HypixelClient {
  /** The Hypixel API Key */
  public apiKey: string;

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

  /** A Custom Hypixel Client with Caching */
  constructor(apiKey: string) {
    this.apiKey = apiKey;

    this.setupQueue();
  }

  private async setupQueue() {
    while (true) {
      if (this.queue.length && this.requestsLeft > 0) {
        await this.queue[0]();
        this.queue.splice(0, 1);
      }

      await new Promise(res => setTimeout(res, 1));
    }
  }

  public async fetch(url: string, options: FetchOptions = {}): Promise<any> {
    let resolve: (data: any) => void;

    const func = async () => {
      const res = await axios
        .get(url, {
          headers: this.headers,
        })
        .catch(err => err.response);

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
        this.requestsLeft = 0;
        if (!this.resetTimeout) {
          this.resetTimeout = setTimeout(() => {
            this.fetchKeyInfo();
            this.requestsLeft = 1;
          }, 60_000);
        }
        this.queue.push(func);
        return;
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

  public async fetchKeyInfo() {
    return await this.fetch(`https://api.hypixel.net/key?key=${this.apiKey}`, {
      priority: true,
    });
  }

  public async fetchAHPage(page = 0) {
    return await this.fetch(`https://api.hypixel.net/skyblock/auctions?page=${page}`, {
      ignoreRateLimit: true,
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
}
