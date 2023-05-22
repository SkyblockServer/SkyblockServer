import { hypixel } from '..';
import Auction from '../classes/Auction';

export const auctions: Auction[] = [];

export async function loadAuctions() {
  console.log('Loading Auctions...');

  let page = await hypixel.fetchAHPage(0);

  for (const auction of page.auctions) {
    auctions.push(new Auction(auction));
  }

  const promises = [];

  for (let i = 1; i < page.totalPages; i++) {
    promises.push(hypixel.fetchAHPage(i).then(data => auctions.push(...data.auctions.map(auction => new Auction(auction)))));
  }

  await Promise.all(promises);

  console.log(`Fetched ${page.totalPages} Pages of Auctions! (${auctions.length} Auctions)`);
}
