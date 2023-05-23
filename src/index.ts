import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { auctions, clearEndedAuctions, loadAuctions, updateAuctions } from './caches/auctions';
import HypixelClient from './classes/HypixelClient';
import PlayerManager from './classes/PlayerManager';
import { auctionsUpdateInterval } from './constants';
import { initServer } from './server';
import { setAsyncInterval } from './utils';

export const players = new PlayerManager();
export const hypixel = new HypixelClient(process.env.HYPIXEL_API_KEY);

export const app = express();
export const server = createServer(app);
initServer(server);

app.get('/', (req, res) => res.sendStatus(200));

(async () => {
  await hypixel.fetchKeyInfo();

  await loadAuctions();
  setAsyncInterval(
    async () => {
      let l = [...auctions.values()].length;
      console.log(l);
      await clearEndedAuctions();
      console.log(l - [...auctions.values()].length);
      l = [...auctions.values()].length;
      await updateAuctions();
      console.log([...auctions.values()].length - l);
    },
    auctionsUpdateInterval,
    true
  );

  console.log('');

  server.listen(process.env.PORT, () => console.log('Server Online!'));
})();
