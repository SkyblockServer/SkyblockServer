import { NextFunction, Request, Response } from 'express';
import { t } from '.';

/**
 * RateLimit Middleware for Express Server Routes
 * @param amount The amount of requests allowed in a certain timeframe
 * @param interval The amount of time to wait before resetting the ratelimit (default 1 minute)
 * @param dynamic If `true`, you are allowed `amount` requests every `interval`, and it does not reset at a specific time. If `false`, ratelimits reset after every `interval`, and you are allowed `amount` requests in that time period. (default `false`)
 */
export default function ratelimit(amount: number, interval: number = t(1, 'm'), dynamic: boolean = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Ratelimits

    // Use Mongo to store ratelimit info based on api key

    res.setHeader('X-Ratelimit-Max', amount);
    res.setHeader('X-Ratelimit-Interval', interval);
    res.setHeader('X-Ratelimit-Dynamic', dynamic ? 'True' : 'False');

    next();
  };
}
