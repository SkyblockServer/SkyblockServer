import { Collection, Filter, MongoClient } from 'mongodb';
import Auction, { AuctionMongoData } from '../classes/Auction';
import Logger from '../classes/Logger';

const logger = new Logger('MongoDB');

/** A Mongo Client we use */
export default class Mongo {
  public client: MongoClient;

  public auctions: Collection<AuctionMongoData>;

  constructor(url = process.env.MONGO_URL) {
    this.client = new MongoClient(url, {
      retryWrites: true,
    });
  }

  public async connect() {
    await this.client.connect().then(() => logger.log('Connected!'));

    this.auctions = this.client.db('Auctions').collection('auctions');
  }

  public async resetAuctions() {
    await this.auctions.drop();

    this.auctions = await this.client.db('Auctions').createCollection('auctions');
  }

  public async addAuctions(auctions: AuctionMongoData[]) {
    return await this.auctions.insertMany(auctions);
  }

  public async addAuction(auction: AuctionMongoData) {
    return await this.auctions.updateOne(
      {
        id: auction.id,
      },
      {
        $set: auction,
      },
      {
        upsert: true,
      }
    );
  }

  public async deleteAuction(id: string) {
    return await this.auctions.deleteOne({
      id,
    });
  }
  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects: false): Promise<AuctionMongoData[]>;
  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects: true): Promise<Auction[]>;
  public async findAuctions(filter: Filter<AuctionMongoData>, asAuctionObjects: boolean = false): Promise<AuctionMongoData[] | Auction[]> {
    const auctions = await this.auctions.find(filter).toArray();

    if (asAuctionObjects) return auctions.map(a => Auction.fromMongoData(a));
    return auctions;
  }
}
