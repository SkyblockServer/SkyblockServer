import { MongoClient } from 'mongodb';
import { parentPort, threadId, workerData } from 'worker_threads';

const client = new MongoClient(process.env.MONGO_URL, {
  retryWrites: true,
  compressors: ['snappy', 'zlib', 'zstd'],
  zlibCompressionLevel: 9,
  appName: `SkyblockServer (Thread ${threadId})`,
});

client
  .connect()
  .then(() => {
    const col = client.db('Auctions').collection('auctions');

    col
      .insertMany(workerData, {
        bypassDocumentValidation: true,
        willRetryWrite: true,
        retryWrites: true,
      })
      .then(() => {
        parentPort.postMessage('done');
      })
      .catch(err => parentPort.postMessage(err));
  })
  .catch(err => parentPort.postMessage(err));
