import { join } from 'path';
import { Worker } from 'worker_threads';
import { hypixel, mongo } from '..';
import Auction, { AuctionMongoData } from '../classes/Auction';
import Logger from '../classes/Logger';
import { auctionsLoadThreadCount } from '../constants';
import { wait } from '../utils';

let lastUpdated = 0;

const logger = new Logger('Auctions');

export async function loadAuctions(log: boolean) {
  if (log) logger.debug('Fetching Auctions...');

  let page = await hypixel.fetch(`https://api.hypixel.net/skyblock/auctions?page=0`, {
    ignoreRateLimit: true,
  });

  const auctions: AuctionMongoData[] = [];
  for (const auction of page.auctions) {
    const auc = new Auction(auction);
    auctions.push(auc.toMongoData());
    if (auc.lastUpdated > lastUpdated) lastUpdated = auc.lastUpdated;
  }

  await mongo.resetAuctions();

  await mongo.addAuctions(auctions);

  let highestPage = 1;
  let activeThreads = 0;

  while (highestPage < page.totalPages) {
    if (activeThreads < auctionsLoadThreadCount) {
      activeThreads++;

      const thread = new Worker(join(__dirname, '../workers/loadAuctions.js'), {
        workerData: {
          page: highestPage,
          lastUpdated,
        },
        env: process.env,
      });

      thread.on('message', data => {
        if (typeof data === 'string' && data.startsWith('done')) {
          thread.terminate();

          const newLastUpdated = Number(data.split(':')[1]);
          if (newLastUpdated > lastUpdated) lastUpdated = newLastUpdated;

          activeThreads -= 1;
        } else logger.throw(data);
      });

      highestPage++;
    }

    await wait();
  }

  if (log) logger.debug(`Fetched ${page.totalPages} Pages of Auctions! (${page.totalAuctions} Auctions)`);
}

export async function updateAuctions() {
  let page = 0;
  let next = true;
  let newLastUpdated = 0;

  while (next) {
    await hypixel
      .fetch(`https://api.hypixel.net/skyblock/auctions?page=${page}`, {
        ignoreRateLimit: true,
      })
      .then(async data => {
        // If Final Page
        if (data.page === data.totalPages - 1) next = false;

        const promises = [];

        // Each Auction
        for (const auction of data.auctions) {
          const auc = new Auction(auction);

          promises.push(mongo.addAuction(auc.toMongoData()));

          // Update "lastUpdated" values
          if (auc.lastUpdated > newLastUpdated) newLastUpdated = auc.lastUpdated;
          if (auc.lastUpdated < lastUpdated) next = false;
        }

        await Promise.all(promises);

        // Increment Page
        page++;
      });
  }

  lastUpdated = newLastUpdated;
}

export async function clearEndedAuctions() {
  const recentlyEnded = await hypixel.fetch('https://api.hypixel.net/skyblock/auctions_ended', {
    ignoreRateLimit: true,
  });

  await Promise.all(recentlyEnded.auctions.map(auction => mongo.deleteAuction(auction.auction_id)));

  // TODO: Decide whether or not to remove expired auctions which haven't been reclaimed by the seller
  // Decided not to as hypixel api would just re-add them
  // for (const [_, auction] of auctions) if (auction.ended) auctions.delete(auction.id);
}
