import { hypixel } from '..';
import Auction from '../classes/Auction';

export const auctions: Auction[] = [];

export async function loadAuctions() {
  console.log('Loading Auctions...');

  let page = await hypixel.fetch(`https://api.hypixel.net/skyblock/auctions?page=0`, {
    ignoreRateLimit: true,
  });

  for (const auction of page.auctions) {
    auctions.push(new Auction(auction));
  }

  const promises = [];

  for (let i = 1; i < page.totalPages; i++) {
    promises.push(
      hypixel
        .fetch(`https://api.hypixel.net/skyblock/auctions?page=${i}`, {
          ignoreRateLimit: true,
        })
        .then(data => auctions.push(...data.auctions.map(auction => new Auction(auction))))
    );
  }

  await Promise.all(promises);

  console.log(`Fetched ${page.totalPages} Pages of Auctions! (${auctions.length} Auctions)`);

  setInterval(async () => {
    console.log('Updating Auctions', auctions.length);
    const recentlyEnded = await hypixel.fetch('https://api.hypixel.net/skyblock/auctions_ended');
    for (const auction of recentlyEnded.auctions) {
      const index = auctions.findIndex(a => a.id == auction.auction_id);
      if (index !== -1) auctions.splice(index, 1);
    }

    console.log('Auctions Removed', auctions.length);

    let next = true;
    let page = 0;

    while (next) {
      await hypixel
        .fetch(`https://api.hypixel.net/skyblock/auctions?page=${page}`, {
          ignoreRateLimit: true,
        })
        .then(data => {
          for (const auction of data.auctions) {
            if (auctions.find(a => a.id == auction.uuid)) next = false;

            if (next || !auctions.find(a => a.id == auction.uuid)) auctions.push(new Auction(auction));
            else auctions[auctions.findIndex(a => a.id == auction.uuid)].update(auction);
          }
        });
    }
    console.log('Updated Auctions', auctions.length);
  }, 60_000);
}
