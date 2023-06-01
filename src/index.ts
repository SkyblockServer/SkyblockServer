import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { clearEndedAuctions, loadAuctions, updateAuctions } from './caches/auctions';
import HypixelClient from './classes/HypixelClient';
import Logger from './classes/Logger';
import PlayerManager from './classes/PlayerManager';
import { auctionsReloadInterval, auctionsUpdateInterval } from './constants';
import Mongo from './database/Mongo';
import { initServer } from './server';
import { setAsyncInterval } from './utils';

export const players = new PlayerManager();
export const hypixel = new HypixelClient(process.env.HYPIXEL_API_KEY);

export const app = express();
export const server = createServer(app);
export const mongo = new Mongo();

initServer(server);

const logger = new Logger('MAIN');

app.get('/', (req, res) => res.sendStatus(200));

(async () => {
  await mongo.connect();

  await hypixel.fetchKeyInfo();

  await loadAuctions(true);
  setInterval(async () => {
    await clearEndedAuctions();
    await updateAuctions();
  }, auctionsUpdateInterval);
  setAsyncInterval(async () => {
    await loadAuctions(false);
  }, auctionsReloadInterval);

  console.log('');

  server.listen(process.env.PORT, () => logger.log('Server Online!'));
})();
