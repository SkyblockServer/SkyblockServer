import axios from 'axios';
import { MongoClient } from 'mongodb';
import { parentPort, workerData } from 'worker_threads';
import Auction, { AuctionMongoData } from '../classes/Auction';

const client = new MongoClient(process.env.MONGO_URL, {
  retryWrites: true,
  compressors: ['snappy', 'zlib', 'zstd'],
  zlibCompressionLevel: 9,
  appName: `SkyblockServer Auctions Loader (Page ${workerData.page})`,
});

(async () => {
  let lastUpdated = workerData.lastUpdated;

  const auctions: AuctionMongoData[] = [];

  await Promise.all([
    axios
      .get(`https://api.hypixel.net/skyblock/auctions?page=${workerData.page}`)
      .then(res => res.data)
      .then(data => {
        for (const auction of data.auctions) {
          const auc = new Auction(auction);
          auctions.push(auc.toMongoData());
          if (auc.lastUpdated > lastUpdated) lastUpdated = auc.lastUpdated;
        }
      })
      .catch(err => parentPort.postMessage(err.toString())),
    client.connect().catch(err => parentPort.postMessage(err.toString())),
  ]).catch(err => parentPort.postMessage(err.toString()));

  const col = client.db('Auctions').collection('auctions');

  await col
    .insertMany(auctions, {
      bypassDocumentValidation: true,
      willRetryWrite: true,
      retryWrites: true,
    })
    .catch(err => parentPort.postMessage(err.toString()));

  parentPort.postMessage(`done:${lastUpdated}`);
})();
