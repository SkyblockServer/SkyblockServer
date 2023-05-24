import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { clearEndedAuctions, loadAuctions, updateAuctions } from './caches/auctions';
import HypixelClient from './classes/HypixelClient';
import Logger from './classes/Logger';
import PlayerManager from './classes/PlayerManager';
import { auctionsUpdateInterval } from './constants';
import { initServer } from './server';
import { setAsyncInterval } from './utils';

export const players = new PlayerManager();
export const hypixel = new HypixelClient(process.env.HYPIXEL_API_KEY);

export const app = express();
export const server = createServer(app);
initServer(server);

const logger = new Logger('MAIN');

app.get('/', (req, res) => res.sendStatus(200));

(async () => {
  await hypixel.fetchKeyInfo();

  await loadAuctions();
  setAsyncInterval(async () => {
    await clearEndedAuctions();
    await updateAuctions();
  }, auctionsUpdateInterval);

  console.log('');

  server.listen(process.env.PORT, () => logger.log('Server Online!'));
})();
