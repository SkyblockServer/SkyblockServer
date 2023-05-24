import { hypixel } from '..';
import Auction from '../classes/Auction';
import Logger from '../classes/Logger';

export const auctions: Map<string, Auction> = new Map();
let lastUpdated = 0;

const logger = new Logger('Auctions');

export async function loadAuctions() {
  logger.debug('Loading Auctions...');

  let page = await hypixel.fetch(`https://api.hypixel.net/skyblock/auctions?page=0`, {
    ignoreRateLimit: true,
  });

  for (const auction of page.auctions) {
    const auc = new Auction(auction);
    auctions.set(auc.id, auc);
    if (auc.lastUpdated > lastUpdated) lastUpdated = auc.lastUpdated;
  }

  const promises = [];

  for (let i = 1; i < page.totalPages; i++) {
    promises.push(
      hypixel
        .fetch(`https://api.hypixel.net/skyblock/auctions?page=${i}`, {
          ignoreRateLimit: true,
        })
        .then(data => {
          for (const auction of data.auctions) {
            const auc = new Auction(auction);
            auctions.set(auc.id, auc);
            if (auc.lastUpdated > lastUpdated) lastUpdated = auc.lastUpdated;
          }
        })
    );
  }

  await Promise.all(promises);

  logger.debug(`Fetched ${page.totalPages} Pages of Auctions! (${[...auctions.values()].length} Auctions)`);
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
      .then(data => {
        // If Final Page
        if (data.page === data.totalPages - 1) next = false;

        // Each Auction
        for (const auction of data.auctions) {
          // Update cache
          if (auctions.has(auction.uuid)) auctions.get(auction.uuid).update(auction);
          else auctions.set(auction.uuid, new Auction(auction));

          // Get Auction
          const auc = auctions.get(auction.uuid);

          // Update "lastUpdated" values
          if (auc.lastUpdated > newLastUpdated) newLastUpdated = auc.lastUpdated;
          if (auc.lastUpdated < lastUpdated) next = false;
        }

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

  for (const auction of recentlyEnded.auctions) auctions.delete(auction.auction_id);

  // TODO: Decide whether or not to remove expired auctions which haven't been reclaimed by the seller
  // Decided not to as hypixel api would just re-add them
  // for (const [_, auction] of auctions) if (auction.ended) auctions.delete(auction.id);
}
