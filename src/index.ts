import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { loadAuctions } from './caches/auctions';
import HypixelClient from './classes/HypixelClient';
import PlayerManager from './classes/PlayerManager';
import { initServer } from './server';

export const players = new PlayerManager();
export const hypixel = new HypixelClient(process.env.HYPIXEL_API_KEY);

export const app = express();
export const server = createServer(app);
initServer(server);

app.get('/', (req, res) => res.sendStatus(200));

(async () => {
  await hypixel.fetchKeyInfo();

  await loadAuctions();

  console.log('');

  server.listen(process.env.PORT, () => console.log('Server Online!'));
})();
